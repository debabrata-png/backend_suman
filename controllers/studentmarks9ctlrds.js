const StudentMarks9ds = require('../Models/studentmarks9ds');
const SubjectComponentConfig9ds = require('../Models/subjectcomponentconfig9ds');
const User = require('../Models/user');

// Helper function to calculate grade
function calculateGrade(obtained, max) {
  if (!obtained || !max || max === 0) return 'E';
  const percentage = (obtained / max) * 100;
  if (percentage >= 91) return 'A1';
  if (percentage >= 81) return 'A2';
  if (percentage >= 71) return 'B1';
  if (percentage >= 61) return 'B2';
  if (percentage >= 51) return 'C1';
  if (percentage >= 41) return 'C2';
  if (percentage >= 33) return 'D';
  return 'E';
}

// Get students and subjects using aggregation pipeline
exports.getstudentsandsubjectsformarks9ds = async (req, res) => {
  try {
    const { colid, semester, academicyear, term, componentname } = req.query;
    
    // Get students using aggregation
    const students = await User.aggregate([
      {
        $match: {
          colid: Number(colid),
          semester: semester
        }
      },
      {
        $project: {
          regno: 1,
          name: 1
        }
      },
      {
        $sort: { regno: 1 }
      }
    ]);
    
    // Get active subjects with component info using aggregation
    const activeFieldName = `${componentname}active`;
    const maxFieldName = `${componentname}max`;
    
    const subjects = await SubjectComponentConfig9ds.aggregate([
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
          maxmarks: `$${maxFieldName}`
        }
      },
      {
        $sort: { subjectname: 1 }
      }
    ]);
    
    // Get existing marks using aggregation with lookup
    const existingMarks = await StudentMarks9ds.aggregate([
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
          status: 1
        }
      }
    ]);
    
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
    const { colid, user, semester, academicyear, componentname, marks } = req.body;
    
    if (!marks || marks.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No marks data provided'
      });
    }
    
    const obtainedFieldName = `${componentname}obtained`;
    const isTerm1 = componentname.startsWith('term1');
    
    // Prepare bulk operations
    const bulkOps = marks.map(markEntry => {
      const { regno, subjectcode, obtained, studentname, subjectname } = markEntry;
      
      const updateFields = {
        [obtainedFieldName]: obtained || 0,
        updatedat: new Date()
      };
      
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
    
    // Recalculate totals using aggregation and update
    const regnos = [...new Set(marks.map(m => m.regno))];
    const subjectcodes = [...new Set(marks.map(m => m.subjectcode))];
    
    // Get all marks for recalculation
    const marksToRecalc = await StudentMarks9ds.find({
      colid: Number(colid),
      regno: { $in: regnos },
      subjectcode: { $in: subjectcodes },
      semester: semester,
      academicyear: academicyear
    });
    
    // Prepare total calculation updates
    const totalUpdateOps = marksToRecalc.map(mark => {
      let total, grade, totalField, gradeField;
      
      if (isTerm1) {
        total = 
          (mark.term1periodictestobtained || 0) +
          (mark.term1notebookobtained || 0) +
          (mark.term1enrichmentobtained || 0) +
          (mark.term1midexamobtained || 0);
        grade = calculateGrade(total, 100);
        totalField = 'term1total';
        gradeField = 'term1grade';
      } else {
        total = 
          (mark.term2periodictestobtained || 0) +
          (mark.term2notebookobtained || 0) +
          (mark.term2enrichmentobtained || 0) +
          (mark.term2annualexamobtained || 0);
        grade = calculateGrade(total, 100);
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

// Get distinct semesters and years from User table
exports.getdistinctsemestersandyears9ds = async (req, res) => {
  try {
    const { colid } = req.query;
    
    // Get distinct semesters and admission years using aggregation
    const result = await User.aggregate([
      {
        $match: {
          colid: Number(colid),
        }
      },
      {
        $group: {
          _id: null,
          semesters: { $addToSet: '$semester' },
          admissionyears: { $addToSet: '$admissionyear' }
        }
      },
      {
        $project: {
          _id: 0,
          semesters: 1,
          admissionyears: 1
        }
      }
    ]);
    
    if (!result || result.length === 0) {
      return res.json({
        success: true,
        semesters: ['9', '10'],
        admissionyears: []
      });
    }
    
    // Sort semesters and years
    const semesters = result[0].semesters.sort();
    const admissionyears = result[0].admissionyears.filter(y => y).sort().reverse();
    
    res.json({
      success: true,
      semesters: semesters,
      admissionyears: admissionyears
    });
  } catch (error) {
    console.error('Error in getdistinctsemestersandyears9ds:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get semesters and years',
      error: error.message
    });
  }
};
