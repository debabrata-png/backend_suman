const StudentMarks9ds = require('../Models/studentmarks9ds');
const SubjectComponentConfig9ds = require('../Models/subjectcomponentconfig9ds');
const User = require('../Models/user');
const CoScholasticActivity9ds = require('../Models/CoScholasticActivity9ds');
const CoScholasticGrade9ds = require('../Models/CoScholasticGrade9ds');

// Helper function to calculate grade
function calculateGrade(obtained, max) {
  if (max === 0 || max === null || max === undefined) return '-';
  if (!obtained && obtained !== 0) return 'E';
  // Round to 2 decimals to avoid floating-point issues (e.g. 32.999 vs 33.0)
  const percentage = Math.round((obtained / max) * 10000) / 100;
  if (percentage >= 91) return 'A1';
  if (percentage >= 81) return 'A2';
  if (percentage >= 71) return 'B1';
  if (percentage >= 61) return 'B2';
  if (percentage >= 51) return 'C1';
  if (percentage >= 41) return 'C2';
  if (percentage >= 33) return 'D';
  return 'E';
}

function toRoman(num) {
  if (!num || isNaN(num) || num === '-') return num;
  const lookup = { M: 1000, CM: 900, D: 500, CD: 400, C: 100, XC: 90, L: 50, XL: 40, X: 10, IX: 9, V: 5, IV: 4, I: 1 };
  let roman = '';
  for (let i in lookup) {
    while (num >= lookup[i]) {
      roman += i;
      num -= lookup[i];
    }
  }
  return roman;
}

// Get students and subjects using aggregation pipeline
exports.getstudentsandsubjectsformarks9ds = async (req, res) => {
  try {
    const { colid, semester, academicyear, term, componentname, section } = req.query;

    const matchStage = {
      colid: Number(colid),
      role: 'Student'
    };

    if (semester) {
      matchStage.semester = { $regex: new RegExp(`^${semester.trim()}$`, 'i') };
    }

    if (section) {
      matchStage.section = { $regex: new RegExp(`^${section.trim()}$`, 'i') };
    }

    // Add Search criteria
    const { search } = req.query;
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      matchStage.$or = [
        { name: searchRegex },
        { regno: searchRegex },
        { rollno: searchRegex }
      ];
    }

    // Get students using aggregation
    const students = await User.aggregate([
      {
        $match: matchStage
      },
      {
        $project: {
          regno: 1,
          name: 1,
          rollno: 1
        }
      },
      {
        $sort: { regno: 1 }
      }
    ]);

    // Check if it's an attendance component
    const attendanceFields = [
      'term1totalworkingdays', 'term1totalpresentdays',
      'term2totalworkingdays', 'term2totalpresentdays'
    ];
    const isAttendance = attendanceFields.includes(componentname);
    const isRemarks = componentname === 'teacherremarks';
    const isSpecial = isAttendance || isRemarks;

    let subjects = [];
    let existingMarks = [];

    if (isSpecial) {
      // Return a dummy subject for attendance or remarks
      subjects = [{
        subjectcode: isRemarks ? 'REMARKS' : 'ATTENDANCE',
        subjectname: isRemarks ? 'Teacher Remarks' : 'Attendance',
        maxmarks: 500 
      }];

      // Get existing marks for the special subject
      existingMarks = await StudentMarks9ds.aggregate([
        {
          $match: {
            colid: Number(colid),
            semester: semester,
            academicyear: academicyear,
            subjectcode: isRemarks ? 'REMARKS' : 'ATTENDANCE'
          }
        },
        {
          $project: {
            regno: 1,
            subjectcode: 1,
            obtainedmarks: (isAttendance ? `$${componentname}` : { $literal: '' }), 
            term1totalworkingdays: 1,
            term2totalworkingdays: 1,
            term1total: 1,
            term2total: 1,
            status: 1,
            isabsent: 1,
            teacherremarks: 1,
            colid: 1,
            semester: 1,
            academicyear: 1,
            promotedclass: 1,
            newsessiondate: 1
          }
        }
      ]);

    } else {
      // Standard subject component logic
      const activeFieldName = `${componentname}active`;
      const maxFieldName = `${componentname}max`;

      subjects = await SubjectComponentConfig9ds.aggregate([
        {
          $match: {
            colid: Number(colid),
            semester: semester,
            academicyear: academicyear,
            isactive: true,
            [activeFieldName]: true
          }
        },
        {
          $project: {
            subjectcode: 1,
            subjectname: 1,
            isadditional: 1,
            maxmarks: `$${maxFieldName}`
          }
        },
        {
          $sort: { createdAt: 1 }
        }
      ]);

      const absentMapping = {
        'term1periodictest': 'term1periodictestabsent',
        'term1midexam': 'term1midexamabsent',
        'term2periodictest': 'term2periodictestabsent',
        'term2annualexam': 'term2annualexamabsent'
      };
      const absentFieldToProject = absentMapping[componentname] ? `$${absentMapping[componentname]}` : false;

      // Get existing marks using aggregation with lookup
      existingMarks = await StudentMarks9ds.aggregate([
        {
          $match: {
            colid: Number(colid),
            semester: semester,
            academicyear: academicyear
          }
        },
        {
          $project: {
            regno: 1,
            subjectcode: 1,
            obtainedmarks: `$${componentname}obtained`,
            term1total: 1,
            term2total: 1,
            isgrace: 1,
            isabsent: absentFieldToProject !== false ? { $cond: [{ $eq: [absentFieldToProject, true] }, true, false] } : { $literal: false },
            status: 1,
            teacherremarks: 1,
            colid: 1,
            semester: 1,
            academicyear: 1,
            promotedclass: 1,
            newsessiondate: 1
          }
        }
      ]);
    }

    res.json({
      success: true,
      students: students,
      subjects: subjects,
      existingmarks: existingMarks,
      componentname: componentname,
      term: term
    });
  } catch (error) {
    console.error('Error in getstudentsandsubjectsformarks9ds:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get students and subjects',
      error: error.message
    });
  }
};

// Bulk save marks using bulkWrite (optimized)
exports.bulksavemarksbycomponent9ds = async (req, res) => {
  try {
    const { colid, user, semester, academicyear, componentname, marks, extraUpdates } = req.body;

    if (!marks || marks.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No marks data provided'
      });
    }

    const attendanceFields = [
      'term1totalworkingdays', 'term1totalpresentdays',
      'term2totalworkingdays', 'term2totalpresentdays'
    ];
    const isAttendance = attendanceFields.includes(componentname);

    let obtainedFieldName;
    if (isAttendance) {
      obtainedFieldName = componentname;
    } else {
      obtainedFieldName = `${componentname}obtained`;
    }

    const isTerm1 = componentname.startsWith('term1');

    // Prepare bulk operations
    const bulkOps = marks.map(markEntry => {
      const { regno, subjectcode, obtained, studentname, subjectname, isgrace, isabsent, teacherremarks, promotedclass, newsessiondate } = markEntry;

      const mapping = {
        'term1periodictest': { field: 'term1periodictestobtained', absentField: 'term1periodictestabsent' },
        'term1notebook': { field: 'term1notebookobtained' },
        'term1enrichment': { field: 'term1enrichmentobtained' },
        'term1midexam': { field: 'term1midexamobtained', absentField: 'term1midexamabsent' },
        'term2periodictest': { field: 'term2periodictestobtained', absentField: 'term2periodictestabsent' },
        'term2notebook': { field: 'term2notebookobtained' },
        'term2enrichment': { field: 'term2enrichmentobtained' },
        'term2annualexam': { field: 'term2annualexamobtained', absentField: 'term2annualexamabsent' },
        'term1totalpresentdays': { field: 'term1totalpresentdays' },
        'term2totalpresentdays': { field: 'term2totalpresentdays' }
      };

      const targetField = (mapping[componentname] && mapping[componentname].field) ? mapping[componentname].field : null;
      const absentField = (mapping[componentname] && mapping[componentname].absentField) ? mapping[componentname].absentField : null;

      const updateFields = {
        isgrace: isgrace || false,
        teacherremarks: (teacherremarks === undefined || teacherremarks === null) ? '' : teacherremarks,
        promotedclass: promotedclass || '',
        newsessiondate: newsessiondate || '',
        updatedat: new Date()
      };

      if (targetField) {
        updateFields[targetField] = (obtained !== undefined && obtained !== null && obtained !== '') ? Number(obtained) : 0;
      }

      if (absentField) {
        updateFields[absentField] = isabsent || false;
      }

      if (extraUpdates) {
        Object.assign(updateFields, extraUpdates);
      }

      // Add student/subject names if provided
      if (studentname) updateFields.studentname = studentname;
      if (subjectname) updateFields.subjectname = subjectname;

      return {
        updateOne: {
          filter: {
            colid: Number(colid),
            regno: regno,
            subjectcode: subjectcode,
            semester: semester,
            academicyear: academicyear
          },
          update: {
            $set: updateFields,
            $setOnInsert: {
              name: 'system',
              user: user,
              colid: Number(colid),
              regno: regno,
              subjectcode: subjectcode,
              semester: semester,
              academicyear: academicyear,
              createdat: new Date()
            }
          },
          upsert: true
        }
      };
    });

    // Execute bulk write
    const bulkResult = await StudentMarks9ds.bulkWrite(bulkOps);

    // Recalculate totals: gather unique regnos and subjectcodes
    const regnos = [...new Set(marks.map(m => m.regno))];
    const subjectcodes = [...new Set(marks.map(m => m.subjectcode))];

    // Get all current marks for recalculation
    const marksToRecalc = await StudentMarks9ds.find({
      colid: Number(colid),
      regno: { $in: regnos },
      subjectcode: { $in: subjectcodes },
      semester: semester,
      academicyear: academicyear
    });

    // Fetch subject configs to get actual max marks for each subject
    const subjectConfigs = await SubjectComponentConfig9ds.find({
      colid: Number(colid),
      semester: semester,
      academicyear: academicyear,
      subjectcode: { $in: subjectcodes }
    });

    // Build a map: subjectcode → max marks for this term
    const maxMarksMap = {};
    subjectConfigs.forEach(cfg => {
      if (isTerm1) {
        const t1max =
          (cfg.term1periodictestactive ? (cfg.term1periodictestmax || 0) : 0) +
          (cfg.term1notebookactive ? (cfg.term1notebookmax || 0) : 0) +
          (cfg.term1enrichmentactive ? (cfg.term1enrichmentmax || 0) : 0) +
          (cfg.term1midexamactive ? (cfg.term1midexammax || 0) : 0);
        maxMarksMap[cfg.subjectcode] = t1max || 100; // fallback 100
      } else {
        const t2max =
          (cfg.term2periodictestactive ? (cfg.term2periodictestmax || 0) : 0) +
          (cfg.term2notebookactive ? (cfg.term2notebookmax || 0) : 0) +
          (cfg.term2enrichmentactive ? (cfg.term2enrichmentmax || 0) : 0) +
          (cfg.term2annualexamactive ? (cfg.term2annualexammax || 0) : 0);
        maxMarksMap[cfg.subjectcode] = t2max || 100; // fallback 100
      }
    });

    // Prepare total calculation updates using the actual max marks per subject
    const totalUpdateOps = marksToRecalc.map(mark => {
      let total, grade, totalField, gradeField;
      const subjectMax = maxMarksMap[mark.subjectcode] || 100;

      if (isTerm1) {
        total =
          (mark.term1periodictestobtained || 0) +
          (mark.term1notebookobtained || 0) +
          (mark.term1enrichmentobtained || 0) +
          (mark.term1midexamobtained || 0);
        grade = calculateGrade(total, subjectMax); // ✅ use actual max
        totalField = 'term1total';
        gradeField = 'term1grade';
      } else {
        total =
          (mark.term2periodictestobtained || 0) +
          (mark.term2notebookobtained || 0) +
          (mark.term2enrichmentobtained || 0) +
          (mark.term2annualexamobtained || 0);
        grade = calculateGrade(total, subjectMax); // ✅ use actual max
        totalField = 'term2total';
        gradeField = 'term2grade';
      }

      return {
        updateOne: {
          filter: { _id: mark._id },
          update: {
            $set: {
              [totalField]: total,
              [gradeField]: grade,
              updatedat: new Date()
            }
          }
        }
      };
    });

    // Update totals
    if (totalUpdateOps.length > 0) {
      await StudentMarks9ds.bulkWrite(totalUpdateOps);
    }

    res.json({
      success: true,
      message: `Successfully saved ${bulkResult.upsertedCount + bulkResult.modifiedCount} marks`,
      upserted: bulkResult.upsertedCount,
      modified: bulkResult.modifiedCount,
      matched: bulkResult.matchedCount
    });
  } catch (error) {
    console.error('Error in bulksavemarksbycomponent9ds:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save marks',
      error: error.message
    });
  }
};

// Get student marks using aggregation
exports.getstudentmarks9ds = async (req, res) => {
  try {
    const { colid, regno, semester, academicyear } = req.query;

    const marks = await StudentMarks9ds.aggregate([
      {
        $match: {
          colid: Number(colid),
          regno: regno,
          semester: semester,
          academicyear: academicyear
        }
      },
      {
        $sort: { subjectname: 1 }
      },
      {
        $project: {
          __v: 0
        }
      }
    ]);

    res.json({
      success: true,
      count: marks.length,
      data: marks
    });
  } catch (error) {
    console.error('Error in getstudentmarks9ds:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get student marks',
      error: error.message
    });
  }
};

// Finalize student marks using updateMany
exports.finalizestudentmarks9ds = async (req, res) => {
  try {
    const { colid, regno, semester, academicyear } = req.body;

    const result = await StudentMarks9ds.updateMany(
      {
        colid: Number(colid),
        regno: regno,
        semester: semester,
        academicyear: academicyear
      },
      {
        $set: {
          status: 'finalized',
          updatedat: new Date()
        }
      }
    );

    res.json({
      success: true,
      message: `Finalized ${result.modifiedCount} subject marks`,
      count: result.modifiedCount
    });
  } catch (error) {
    console.error('Error in finalizestudentmarks9ds:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to finalize marks',
      error: error.message
    });
  }
};

// Get distinct semesters, years and sections from User table
exports.getdistinctsemestersandyears9ds = async (req, res) => {
  try {
    const { colid } = req.query;

    // Get distinct semesters, admission years and sections using aggregation
    const result = await User.aggregate([
      {
        $match: {
          colid: Number(colid),
        }
      },
      {
        $group: {
          _id: null,
          semesters: { $addToSet: { $trim: { input: '$semester' } } },
          admissionyears: { $addToSet: { $trim: { input: '$admissionyear' } } },
          sections: { $addToSet: { $trim: { input: '$section' } } }
        }
      },
      {
        $project: {
          _id: 0,
          semesters: 1,
          admissionyears: 1,
          sections: 1
        }
      }
    ]);

    if (!result || result.length === 0) {
      return res.json({
        success: true,
        semesters: ['9', '10'],
        admissionyears: [],
        sections: []
      });
    }

    // Sort semesters, years and sections
    const semesters = result[0].semesters.sort();
    const admissionyears = result[0].admissionyears.filter(y => y).sort().reverse();
    const sections = result[0].sections.filter(s => s).sort();

    res.json({
      success: true,
      semesters: semesters,
      admissionyears: admissionyears,
      sections: sections
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get semesters and years',
      error: error.message
    });
  }
};

// Returns distinct sections for a specific class (semester) from User table
// Used by Class 11/12 subject config so sections reflect actual enrolled students
exports.getdistinctsectionsbyclass9ds = async (req, res) => {
  try {
    const { colid, semester } = req.query;
    const matchQuery = { colid: Number(colid) };
    if (semester) matchQuery.semester = semester;

    const result = await User.aggregate([
      { $match: matchQuery },
      { $group: { _id: null, sections: { $addToSet: { $trim: { input: '$section' } } } } },
      { $project: { _id: 0, sections: 1 } }
    ]);

    const sections = (result.length > 0 ? result[0].sections : [])
      .filter(s => s)
      .sort();

    res.json({ success: true, sections });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Start of new endpoint code
const Attendancenew = require('../Models/attendancenew');

// Helper function to calculate attendance (copied from marksheetdatactlrds.js)
async function calculateAttendance(regno, colid, semester, academicyear) {
  try {
    const year = academicyear ? academicyear.split('-')[0] : new Date().getFullYear().toString();

    const attendanceRecords = await Attendancenew.find({
      regno: regno,
      colid: Number(colid),
      semester: semester,
      year: year
    });

    if (attendanceRecords.length === 0) {
      return {
        term1: { working: 0, present: 0 },
        term2: { working: 0, present: 0 }
      };
    }

    const term1Records = [];
    const term2Records = [];

    attendanceRecords.forEach(record => {
      const month = new Date(record.classdate).getMonth() + 1;
      if (month >= 6 && month <= 10) {
        term1Records.push(record);
      } else {
        term2Records.push(record);
      }
    });

    const calculateStats = (records) => {
      const uniqueDates = new Set();
      let presentCount = 0;

      records.forEach(record => {
        const dateStr = new Date(record.classdate).toISOString().split('T')[0];
        uniqueDates.add(dateStr);
        if (record.att === 1 || record.status1 === 'P') {
          presentCount++;
        }
      });

      return {
        working: uniqueDates.size,
        present: presentCount
      };
    };

    return {
      term1: calculateStats(term1Records),
      term2: calculateStats(term2Records)
    };
  } catch (error) {
    console.error('Error calculating attendance:', error);
    return {
      term1: { working: 0, present: 0 },
      term2: { working: 0, present: 0 }
    };
  }
}

// Get marksheet data for PDF using StudentMarks9ds
exports.getmarksheetpdfdata9ds = async (req, res) => {
  try {
    const { regno, colid, semester, academicyear } = req.query;

    // 1. Fetch Student/User Data
    const userData = await User.findOne({
      regno,
      colid: Number(colid)
    });

    if (!userData) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // 2. Fetch Marks Data
    const allMarksData = await StudentMarks9ds.find({
      regno,
      colid: Number(colid),
      semester,
      academicyear
    }).sort({ createdAt: 1 });

    // Filter out Attendance and Remarks records for scholastic table
    const marksData = allMarksData.filter(m => m.subjectcode !== 'ATTENDANCE' && m.subjectcode !== 'REMARKS');
    const attendanceRecord = allMarksData.find(m => m.subjectcode === 'ATTENDANCE') || {};
    const remarksRecord = allMarksData.find(m => m.subjectcode === 'REMARKS') || {};

    // 2.5 Fetch Subject Configs for Max Marks
    const subjectCodes = marksData.map(m => m.subjectcode);
    const componentConfigs = await SubjectComponentConfig9ds.find({
      colid: Number(colid),
      semester,
      academicyear,
      subjectcode: { $in: subjectCodes }

    });

    // Create config map for easy lookup (includes createdAt for subject ordering)
    const configMap = {};
    componentConfigs.forEach(config => {
      configMap[config.subjectcode] = config;
    });

    // Sort marksData by the createdAt of the corresponding config (preserves user-configured order)
    marksData.sort((a, b) => {
      const aTime = (configMap[a.subjectcode] && configMap[a.subjectcode].createdAt) ? new Date(configMap[a.subjectcode].createdAt).getTime() : 0;
      const bTime = (configMap[b.subjectcode] && configMap[b.subjectcode].createdAt) ? new Date(configMap[b.subjectcode].createdAt).getTime() : 0;
      return aTime - bTime;
    });

    if (!marksData || marksData.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Marks data not found for this student'
      });
    }

    // 3. Format Subjects Data
    const subjects = marksData.map(mark => {
      const config = configMap[mark.subjectcode] || {};

      // Check if subject has any marks entered
      const hasMarks = (mark.term1periodictestobtained > 0) ||
        (mark.term1notebookobtained > 0) ||
        (mark.term1enrichmentobtained > 0) ||
        (mark.term1midexamobtained > 0) ||
        (mark.term2periodictestobtained > 0) ||
        (mark.term2notebookobtained > 0) ||
        (mark.term2enrichmentobtained > 0) ||
        (mark.term2annualexamobtained > 0);

      // Term 1 Periodic Test Normalization
      const t1PTMax = config.term1periodictestmax || 40;
      const t1PTObtained = mark.term1periodictestobtained || 0;
      // Convert to out of 10
      const t1PTScaled = t1PTMax > 0 ? (t1PTObtained / t1PTMax) * 10 : 0;

      // Term 2 Periodic Test Normalization
      const t2PTMax = config.term2periodictestmax || 40;
      const t2PTObtained = mark.term2periodictestobtained || 0;
      // Convert to out of 10
      const t2PTScaled = t2PTMax > 0 ? (t2PTObtained / t2PTMax) * 10 : 0;

      // Recalculate Term Totals based on Scaled PT
      const term1TotalRaw =
        t1PTScaled +
        (mark.term1notebookobtained || 0) +
        (mark.term1enrichmentobtained || 0) +
        (mark.term1midexamobtained || 0);

      const term2TotalRaw =
        t2PTScaled +
        (mark.term2notebookobtained || 0) +
        (mark.term2enrichmentobtained || 0) +
        (mark.term2annualexamobtained || 0);

      // Compute the actual max after PT scaling:
      // PT is always scaled to 10 regardless of raw max.
      // Max = 10 (PT scaled) + NB max + EN max + ME max
      const t1NBMax = config.term1notebookmax || 5;
      const t1ENMax = config.term1enrichmentmax || 5;
      const t1MEMax = config.term1midexammax || 80;
      const term1Max = 10 + t1NBMax + t1ENMax + t1MEMax; // e.g. 10+5+5+80=100 or 10+5+5+50=70

      const t2NBMax = config.term2notebookmax || 5;
      const t2ENMax = config.term2enrichmentmax || 5;
      const t2MEMax = config.term2annualexammax || 80;
      const term2Max = 10 + t2NBMax + t2ENMax + t2MEMax;

      const term1GradeRecalc = calculateGrade(term1TotalRaw, term1Max);
      const term2GradeRecalc = calculateGrade(term2TotalRaw, term2Max);

      return {
        subjectname: mark.subjectname,
        isAdditional: config.isadditional || false,
        isCompulsory: config.iscompulsory || false,
        term1PeriodicTest: parseFloat(t1PTScaled.toFixed(1)), // Keep 1 decimal for PT
        term1Notebook: mark.term1notebookobtained || 0,
        term1Enrichment: mark.term1enrichmentobtained || 0,
        term1MidExam: mark.term1midexamobtained || 0,
        term1Total: parseFloat(term1TotalRaw.toFixed(2)), // Total with scaled PT (2 decimals for rank precision)
        term1Grade: term1GradeRecalc,

        term2PeriodicTest: parseFloat(t2PTScaled.toFixed(1)), // Keep 1 decimal for PT
        term2Notebook: mark.term2notebookobtained || 0,
        term2Enrichment: mark.term2enrichmentobtained || 0,
        term2AnnualExam: mark.term2annualexamobtained || 0,
        term2Total: parseFloat(term2TotalRaw.toFixed(2)), // Total with scaled PT (2 decimals for rank precision)
        term2Grade: term2GradeRecalc,
        isgrace: mark.isgrace || false,
        isabsent: mark.isabsent || false, // Added isabsent
        term1periodictestabsent: mark.term1periodictestabsent || false,
        term1midexamabsent: mark.term1midexamabsent || false,
        term2periodictestabsent: mark.term2periodictestabsent || false,
        term2annualexamabsent: mark.term2annualexamabsent || false,
        compartmentobtained: (mark.compartmentobtained !== undefined && mark.compartmentobtained !== null)
          ? mark.compartmentobtained : null,  // Supplementary exam marks
        hasMarks: hasMarks
      };
    }).filter(s => s.hasMarks);

    // 4. Calculate Totals with 50% Weightage — all subjects
    const term1TotalMarks = subjects.reduce((sum, s) => sum + s.term1Total, 0);
    const term2TotalMarks = subjects.reduce((sum, s) => sum + s.term2Total, 0);

    // Apply 50% weightage for Final Assessment
    const term1TotalWeighted = term1TotalMarks * 0.5;
    const term2TotalWeighted = term2TotalMarks * 0.5;
    const grandTotal = term1TotalWeighted + term2TotalWeighted;

    const maxMarks = subjects.length * 100;

    const percentage = maxMarks > 0 ? ((grandTotal / maxMarks) * 100).toFixed(2) : 0;
    const overallGrade = calculateGrade(grandTotal, maxMarks);

    // 5. Fetch Attendance (Manual from StudentMarks)
    // Fallback to first record if not found in dedicated record
    const fallbackRecord = marksData.length > 0 ? marksData[0] : {};

    // Helper to get value > 0
    const getVal = (rec, field) => (rec && rec[field]) ? rec[field] : 0;

    const attendanceData = {
      term1: {
        working: getVal(attendanceRecord, 'term1totalworkingdays') || getVal(fallbackRecord, 'term1totalworkingdays'),
        present: getVal(attendanceRecord, 'term1totalpresentdays') || getVal(fallbackRecord, 'term1totalpresentdays')
      },
      term2: {
        working: getVal(attendanceRecord, 'term2totalworkingdays') || getVal(fallbackRecord, 'term2totalworkingdays'),
        present: getVal(attendanceRecord, 'term2totalpresentdays') || getVal(fallbackRecord, 'term2totalpresentdays')
      }
    };

    // 5.5 Fetch Co-Scholastic Grades
    const coActivities = await CoScholasticActivity9ds.find({
      colid: Number(colid),
      semester: semester,
      academicyear: academicyear,
      isactive: true
    }).sort({ createdat: 1 });
    const coGrades = await CoScholasticGrade9ds.find({
      colid: Number(colid),
      regno: regno,
      semester: semester,
      academicyear: academicyear
    });

    const coGradeMap = {};
    coGrades.forEach(g => {
      coGradeMap[g.activityid.toString()] = g;
    });

    const coScholasticData = coActivities.map(act => ({
      code: act.code || '',
      area: act.activityname,
      term1Grade: (coGradeMap[act._id.toString()] && coGradeMap[act._id.toString()].term1grade) || '',
      term2Grade: (coGradeMap[act._id.toString()] && coGradeMap[act._id.toString()].term2grade) || ''
    }));

    // 5.8 Dynamic Rank Calculation — CLASS-WIDE (no section filter)
    const classStudents = await User.find({
      colid: Number(colid),
      semester: semester,
      role: 'Student'
    }).lean();

    const classRegNos = classStudents.map(s => s.regno);

    // Fetch all marks for the batch (class-wide)
    const allStudentMarks = await StudentMarks9ds.find({
      colid: Number(colid),
      semester,
      academicyear,
      subjectcode: { $nin: ['ATTENDANCE', 'REMARKS'] },
      regno: { $in: classRegNos }
    }, {
      regno: 1,
      subjectcode: 1,
      term1periodictestobtained: 1,
      term1notebookobtained: 1,
      term1enrichmentobtained: 1,
      term1midexamobtained: 1,
      term2periodictestobtained: 1,
      term2notebookobtained: 1,
      term2enrichmentobtained: 1,
      term2annualexamobtained: 1,
      term1totalpresentdays: 1,
      term2totalpresentdays: 1,
      isgrace: 1,
      term1periodictestabsent: 1,
      term1midexamabsent: 1,
      term2periodictestabsent: 1,
      term2annualexamabsent: 1
    }).lean();

    // Group by regno and collect per-subject data
    const studentGroups = {};
    allStudentMarks.forEach(m => {
      if (!studentGroups[m.regno]) studentGroups[m.regno] = [];
      studentGroups[m.regno].push(m);
    });

    // Calculate per-student percentage for ranking
    const studentRankData = Object.keys(studentGroups).map(rNo => {
      const sMarks = studentGroups[rNo];

      const subjectScores = sMarks.map(m => {
        const conf = configMap[m.subjectcode] || {};

        const hasMarks = [
          m.term1periodictestobtained, m.term1notebookobtained, m.term1enrichmentobtained, m.term1midexamobtained,
          m.term2periodictestobtained, m.term2notebookobtained, m.term2enrichmentobtained, m.term2annualexamobtained
        ].some(val => val !== null && val !== undefined && val !== '') ||
        [
          m.term1periodictestabsent, m.term1midexamabsent,
          m.term2periodictestabsent, m.term2annualexamabsent
        ].some(abs => abs === true || abs === 'true');

        if (!hasMarks) return null;

        // T1
        const t1MaxConfig = conf.term1periodictestmax || 40;
        const t1Obt = m.term1periodictestobtained || 0;
        const t1Sc = t1MaxConfig > 0 ? (t1Obt / t1MaxConfig) * 10 : 0;
        const t1Raw = parseFloat((t1Sc + (m.term1notebookobtained || 0) + (m.term1enrichmentobtained || 0) + (m.term1midexamobtained || 0)).toFixed(1));

        // T2
        const t2MaxConfig = conf.term2periodictestmax || 40;
        const t2Obt = m.term2periodictestobtained || 0;
        const t2Sc = t2MaxConfig > 0 ? (t2Obt / t2MaxConfig) * 10 : 0;
        const t2Raw = parseFloat((t2Sc + (m.term2notebookobtained || 0) + (m.term2enrichmentobtained || 0) + (m.term2annualexamobtained || 0)).toFixed(1));

        // Weighted total 50-50 for overall
        const subTotal = parseFloat(((t1Raw * 0.5) + (t2Raw * 0.5)).toFixed(2));

        return { 
          t1Total: t1Raw, 
          t2Total: t2Raw, 
          overallTotal: subTotal, 
          isAdditional: conf.isadditional || false 
        };
      }).filter(Boolean);

      // Filter out additional subjects for rank calculation
      const rankSubjects = subjectScores.filter(s => 
        !s.isAdditional || s.isAdditional === 'false' || s.isAdditional === false
      );

      // Totals
      const t1Sum = rankSubjects.reduce((sum, s) => sum + s.t1Total, 0);
      const t2Sum = rankSubjects.reduce((sum, s) => sum + s.t2Total, 0);
      const overallSum = rankSubjects.reduce((sum, s) => sum + s.overallTotal, 0);
      
      const maxMarksForRank = rankSubjects.length * 100;
      
      const t1Pct = parseFloat((maxMarksForRank > 0 ? (t1Sum / maxMarksForRank) * 100 : 0).toFixed(2));
      const t2Pct = parseFloat((maxMarksForRank > 0 ? (t2Sum / maxMarksForRank) * 100 : 0).toFixed(2));
      const overallPct = parseFloat((maxMarksForRank > 0 ? (overallSum / maxMarksForRank) * 100 : 0).toFixed(2));

      return { 
        regno: rNo, 
        t1Percentage: t1Pct, 
        t2Percentage: t2Pct, 
        overallPercentage: overallPct 
      };
    });

    // Function to calculate dense rank for a specific percentage field
    const calculateDenseRank = (data, pctField) => {
      const sorted = [...data].sort((a, b) => b[pctField] - a[pctField]);
      let currentDenseRank = 1;
      for (let i = 0; i < sorted.length; i++) {
        if (i > 0 && sorted[i][pctField].toFixed(2) !== sorted[i - 1][pctField].toFixed(2)) {
          currentDenseRank++;
        }
        sorted[i][pctField + 'Rank'] = currentDenseRank;
      }
      return sorted;
    };

    // Calculate ranks for all three scenarios
    let rankedData = calculateDenseRank(studentRankData, 't1Percentage');
    rankedData = calculateDenseRank(rankedData, 't2Percentage');
    rankedData = calculateDenseRank(rankedData, 'overallPercentage');

    const myRankEntry = rankedData.find(s => s.regno === regno);
    const term1Rank = myRankEntry ? toRoman(myRankEntry.t1PercentageRank) : '-';
    const term2Rank = myRankEntry ? toRoman(myRankEntry.t2PercentageRank) : '-';
    const overallRank = myRankEntry ? toRoman(myRankEntry.overallPercentageRank) : '-';
    const rank = overallRank; // Fallback for backward compatibility

    // 6a. Calculate Compartment Subjects (Class 6-12 only: failing subject = weighted score < 33)
    const compartmentSubjects = subjects
      .filter(s => !s.isAdditional)
      .filter(s => {
        const weightedScore = s.term2Total;
        return weightedScore < 33;
      })
      .map(s => ({
        subjectname: s.subjectname,
        term1Total: s.term1Total,
        term2Total: s.term2Total,
        finalScore: parseFloat(s.term2Total.toFixed(1)),
        compartmentobtained: s.compartmentobtained // Supplementary exam marks (null if not yet entered)
      }));

    // 6. Construct PDF Data Object
    const pdfData = {
      session: academicyear,
      classtype: '', // Not in StudentMarks9ds, leave empty or infer
      profile: {
        name: userData.name || '',
        father: userData.fathername || '',
        mother: userData.mothername || '',
        address: userData.address || '',
        classSection: `Class ${semester} - ${userData.section || 'A'}`,
        rollNo: userData.rollno || '', // Verify this is rollno in User schema
        dob: userData.dob || '',
        admissionNo: regno,
        contact: userData.phone || '',
        cbseRegNo: userData.cbseno || '',
        photo: userData.photo || '',
        section: userData.section || ''
      },
      attendance: attendanceData,
      subjects: subjects,
      coScholastic: coScholasticData,
      term1TotalMarks,
      term2TotalMarks,
      term1TotalWeighted, // Added weighted total for display
      term2TotalWeighted, // Added weighted total for display
      grandTotal,
      percentage,
      overallGrade,
      term1Rank: term1Rank,
      term2Rank: term2Rank,
      overallRank: overallRank,
      rank: rank,
      compartmentSubjects,   // List of subjects where student scored < 33 (fail)
      remarks: remarksRecord.teacherremarks || attendanceRecord.teacherremarks || fallbackRecord.teacherremarks || '', // Real teacher remarks from DB
      promotedToClass: remarksRecord.promotedclass || attendanceRecord.promotedclass || fallbackRecord.promotedclass || '',
      newSessionDate: remarksRecord.newsessiondate || attendanceRecord.newsessiondate || fallbackRecord.newsessiondate || ''
    };

    res.json({
      success: true,
      data: pdfData
    });

  } catch (error) {
    console.error('Error in getmarksheetpdfdata9ds:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate marksheet PDF data',
      error: error.message
    });
  }
};
