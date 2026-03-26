const StudentMarks9ds = require('../Models/studentmarks9ds');
const SubjectComponentConfig9ds = require('../Models/subjectcomponentconfig9ds');
const User = require('../Models/user');
const CoScholasticActivity9ds = require('../Models/CoScholasticActivity9ds');
const CoScholasticGrade9ds = require('../Models/CoScholasticGrade9ds');
const Attendancenew = require('../Models/attendancenew');

// Helper function to calculate grade
function calculateGrade(obtained, max) {
  if (max === 0 || max === null || max === undefined) return '-';
  if (!obtained && obtained !== 0) return 'E';
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

// ============================================================
// Class 9-10 Marksheet PDF — WITH Top-5 Subject Selection
// ============================================================
exports.getmarksheetpdfdata9top5ds = async (req, res) => {
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

    const configMap = {};
    componentConfigs.forEach(config => {
      configMap[config.subjectcode] = config;
    });

    // Sort marksData by config createdAt
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

      const hasMarks = (mark.term1periodictestobtained > 0) ||
        (mark.term1notebookobtained > 0) ||
        (mark.term1enrichmentobtained > 0) ||
        (mark.term1midexamobtained > 0) ||
        (mark.term2periodictestobtained > 0) ||
        (mark.term2notebookobtained > 0) ||
        (mark.term2enrichmentobtained > 0) ||
        (mark.term2annualexamobtained > 0);

      // Term 1 PT Normalization
      const t1PTMax = config.term1periodictestmax || 40;
      const t1PTObtained = mark.term1periodictestobtained || 0;
      const t1PTScaled = t1PTMax > 0 ? (t1PTObtained / t1PTMax) * 10 : 0;

      // Term 2 PT Normalization
      const t2PTMax = config.term2periodictestmax || 40;
      const t2PTObtained = mark.term2periodictestobtained || 0;
      const t2PTScaled = t2PTMax > 0 ? (t2PTObtained / t2PTMax) * 10 : 0;

      // Recalculate Term Totals
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

      // Max after PT scaling
      const t1NBMax = config.term1notebookmax || 5;
      const t1ENMax = config.term1enrichmentmax || 5;
      const t1MEMax = config.term1midexammax || 80;
      const term1Max = 10 + t1NBMax + t1ENMax + t1MEMax;

      const t2NBMax = config.term2notebookmax || 5;
      const t2ENMax = config.term2enrichmentmax || 5;
      const t2MEMax = config.term2annualexammax || 80;
      const term2Max = 10 + t2NBMax + t2ENMax + t2MEMax;

      const term1GradeRecalc = calculateGrade(term1TotalRaw, term1Max);
      const term2GradeRecalc = calculateGrade(term2TotalRaw, term2Max);

      return {
        subjectname: mark.subjectname,
        subjectcode: mark.subjectcode,
        isAdditional: config.isadditional || false, // Will be overridden by top-5 logic
        isCompulsory: config.iscompulsory || false,
        term1PeriodicTest: parseFloat(t1PTScaled.toFixed(1)),
        term1Notebook: mark.term1notebookobtained || 0,
        term1Enrichment: mark.term1enrichmentobtained || 0,
        term1MidExam: mark.term1midexamobtained || 0,
        term1Total: parseFloat(term1TotalRaw.toFixed(2)),
        term1Grade: term1GradeRecalc,
        term2PeriodicTest: parseFloat(t2PTScaled.toFixed(1)),
        term2Notebook: mark.term2notebookobtained || 0,
        term2Enrichment: mark.term2enrichmentobtained || 0,
        term2AnnualExam: mark.term2annualexamobtained || 0,
        term2Total: parseFloat(term2TotalRaw.toFixed(2)),
        term2Grade: term2GradeRecalc,
        isgrace: mark.isgrace || false,
        isabsent: mark.isabsent || false,
        term1periodictestabsent: mark.term1periodictestabsent || false,
        term1midexamabsent: mark.term1midexamabsent || false,
        term2periodictestabsent: mark.term2periodictestabsent || false,
        term2annualexamabsent: mark.term2annualexamabsent || false,
        compartmentobtained: (mark.compartmentobtained !== undefined && mark.compartmentobtained !== null)
          ? mark.compartmentobtained : null,
        hasMarks: hasMarks
      };
    }).filter(s => s.hasMarks);

    // ===== TOP-5 SUBJECT SELECTION (PROTECT COMPULSORY) =====
    if (subjects.length > 5) {
      const compulsorySubjects = subjects.filter(s => s.isCompulsory);
      const others = subjects.filter(s => !s.isCompulsory);

      others.sort((a, b) => {
        const aW = (a.term1Total * 0.5) + (a.term2Total * 0.5);
        const bW = (b.term1Total * 0.5) + (b.term2Total * 0.5);
        return bW - aW;
      });

      const mainSubjectCodes = new Set(compulsorySubjects.slice(0, 5).map(s => s.subjectcode));
      for (const s of others) {
        if (mainSubjectCodes.size >= 5) break;
        mainSubjectCodes.add(s.subjectcode);
      }

      subjects.forEach(s => {
        s.isAdditional = !mainSubjectCodes.has(s.subjectcode);
      });
    }

    // 4. Calculate Totals — only top 5 (non-additional) subjects
    const mainSubjects = subjects.filter(s => !s.isAdditional);
    const term1TotalMarks = mainSubjects.reduce((sum, s) => sum + s.term1Total, 0);
    const term2TotalMarks = mainSubjects.reduce((sum, s) => sum + s.term2Total, 0);

    const term1TotalWeighted = term1TotalMarks * 0.5;
    const term2TotalWeighted = term2TotalMarks * 0.5;
    const grandTotal = term1TotalWeighted + term2TotalWeighted;

    const maxMarks = mainSubjects.length * 100;

    const percentage = maxMarks > 0 ? ((grandTotal / maxMarks) * 100).toFixed(2) : 0;
    const overallGrade = calculateGrade(grandTotal, maxMarks);

    // 5. Fetch Attendance
    const fallbackRecord = marksData.length > 0 ? marksData[0] : {};
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

    // 5.8 Dynamic Rank Calculation — CLASS-WIDE, TOP-5 SUBJECTS
    const classStudents = await User.find({
      colid: Number(colid),
      semester: semester,
      role: 'Student'
    }).lean();

    const classRegNos = classStudents.map(s => s.regno);

    const allStudentMarks = await StudentMarks9ds.find({
      colid: Number(colid),
      semester,
      academicyear,
      subjectcode: { $nin: ['ATTENDANCE', 'REMARKS'] },
      regno: { $in: classRegNos }
    }, {
      regno: 1, subjectcode: 1,
      term1periodictestobtained: 1, term1notebookobtained: 1,
      term1enrichmentobtained: 1, term1midexamobtained: 1,
      term2periodictestobtained: 1, term2notebookobtained: 1,
      term2enrichmentobtained: 1, term2annualexamobtained: 1,
      term1periodictestabsent: 1, term1midexamabsent: 1,
      term2periodictestabsent: 1, term2annualexamabsent: 1
    }).lean();

    const studentGroups = {};
    allStudentMarks.forEach(m => {
      if (!studentGroups[m.regno]) studentGroups[m.regno] = [];
      studentGroups[m.regno].push(m);
    });

    // Rank using TOP 5 subjects per student (Unified Selection Logic)
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

        const t1Max = conf.term1periodictestmax || 40;
        const t1Obt = m.term1periodictestobtained || 0;
        const t1Sc = t1Max > 0 ? (t1Obt / t1Max) * 10 : 10;
        const t1Raw = (t1Sc + (m.term1notebookobtained || 0) + (m.term1enrichmentobtained || 0) + (m.term1midexamobtained || 0));

        const t2Max = conf.term2periodictestmax || 40;
        const t2Obt = m.term2periodictestobtained || 0;
        const t2Sc = t2Max > 0 ? (t2Obt / t2Max) * 10 : 10;
        const t2Raw = (t2Sc + (m.term2notebookobtained || 0) + (m.term2enrichmentobtained || 0) + (m.term2annualexamobtained || 0));

        const subTotal = parseFloat(((t1Raw * 0.5) + (t2Raw * 0.5)).toFixed(2));
        
        // Fail check for Term 2 (standard for class 9/10)
        const t2MEMax = conf.term2annualexammax || 80;
        const t2NBMax = conf.term2notebookmax || 5;
        const t2ENMax = conf.term2enrichmentmax || 5;
        const term2Max = 10 + t2NBMax + t2ENMax + t2MEMax;
        const isFail = t2Raw < (term2Max * 0.33);

        return { 
            total: subTotal, 
            isCompulsory: conf.iscompulsory || false,
            isFail: isFail
        };
      }).filter(Boolean);

      // Select Top-5 protecting compulsory
      const compulsory = subjectScores.filter(s => s.isCompulsory);
      const others = subjectScores.filter(s => !s.isCompulsory);
      others.sort((a, b) => b.total - a.total);
      
      const top5Set = new Set(compulsory.slice(0, 5));
      for (const s of others) {
          if (top5Set.size >= 5) break;
          top5Set.add(s);
      }
      const top5 = Array.from(top5Set);

      const top5Total = top5.reduce((sum, s) => sum + s.total, 0);
      const top5Max = top5.length * 100;
      const pct = parseFloat(((top5Max > 0 ? (top5Total / top5Max) * 100 : 0)).toFixed(2));
      const hasFail = top5.some(s => s.isFail);

      return { regno: rNo, percentage: pct, hasFail: hasFail };
    })
    .sort((a, b) => b.percentage - a.percentage);

    // Dense ranking with failure skip
    let currentDenseRank = 1;
    let rankableIndex = 0;
    for (let i = 0; i < studentRankData.length; i++) {
      if (studentRankData[i].hasFail) {
        studentRankData[i].rankValue = null;
      } else {
        if (rankableIndex > 0) {
          const prevPass = studentRankData.slice(0, i).filter(s => !s.hasFail).pop();
          if (prevPass && studentRankData[i].percentage.toFixed(2) !== prevPass.percentage.toFixed(2)) {
            currentDenseRank++;
          }
        }
        studentRankData[i].rankValue = currentDenseRank;
        rankableIndex++;
      }
    }

    const myRankEntry = studentRankData.find(s => s.regno === regno);
    let rank = (myRankEntry && myRankEntry.rankValue) ? toRoman(myRankEntry.rankValue) : '-';

    // 6a. Compartment Subjects — only from top 5 (non-additional)
    const compartmentSubjects = subjects
      .filter(s => !s.isAdditional)
      .filter(s => s.term2Total < 33)
      .map(s => ({
        subjectname: s.subjectname,
        term1Total: s.term1Total,
        term2Total: s.term2Total,
        finalScore: parseFloat(s.term2Total.toFixed(1)),
        compartmentobtained: s.compartmentobtained
      }));

    // 6. Construct PDF Data Object
    const pdfData = {
      session: academicyear,
      classtype: '',
      profile: {
        name: userData.name || '',
        father: userData.fathername || '',
        mother: userData.mothername || '',
        address: userData.address || '',
        classSection: `Class ${semester} - ${userData.section || 'A'}`,
        rollNo: userData.rollno || '',
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
      term1TotalWeighted,
      term2TotalWeighted,
      grandTotal,
      percentage,
      overallGrade,
      rank: rank,
      compartmentSubjects,
      remarks: remarksRecord.teacherremarks || attendanceRecord.teacherremarks || fallbackRecord.teacherremarks || '',
      promotedToClass: remarksRecord.promotedclass || attendanceRecord.promotedclass || fallbackRecord.promotedclass || '',
      newSessionDate: remarksRecord.newsessiondate || attendanceRecord.newsessiondate || fallbackRecord.newsessiondate || ''
    };

    res.json({
      success: true,
      data: pdfData
    });

  } catch (error) {
    console.error('Error in getmarksheetpdfdata9top5ds:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate marksheet PDF data',
      error: error.message
    });
  }
};
