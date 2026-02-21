const StudentMarks11ds = require('../Models/studentmarks11ds');
const SubjectComponentConfig11ds = require('../Models/subjectcomponentconfig11ds');
const User = require('../Models/user');
// const CoScholasticActivity9ds = require('../Models/CoScholasticActivity9ds'); // Reuse or create new if needed? Assuming reuse for now or just generic keys
// const CoScholasticGrade9ds = require('../Models/CoScholasticGrade9ds');

// Helper to calculate grade (generic)
function calculateGrade(obtained, max) {
    if (!obtained && obtained !== 0) return '';
    if (!max || max === 0) return '';
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

// 1. Get Subjects from Config
exports.getsubjectsfromconfig11ds = async (req, res) => {
    try {
        const { colid, semester, academicyear } = req.query;
        const subjects = await SubjectComponentConfig11ds.find({
            colid: Number(colid),
            semester,
            academicyear,
            isactive: true
        }).sort({ createdAt: 1 });
        res.json({ success: true, data: subjects });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 1.5 Save Subject Config
exports.saveSubjectConfig11ds = async (req, res) => {
    try {
        const { id, colid, subjectcode, subjectname, semester, academicyear } = req.body;

        let config;
        if (id) {
            config = await SubjectComponentConfig11ds.findByIdAndUpdate(id, req.body, { new: true });
        } else {
            // Check duplicate
            const existing = await SubjectComponentConfig11ds.findOne({ colid, subjectcode, semester, academicyear });
            if (existing) return res.status(400).json({ success: false, message: "Subject Code already exists for this term" });

            config = new SubjectComponentConfig11ds(req.body);
            await config.save();
        }
        res.json({ success: true, message: "Saved successfully", data: config });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. Get Students and Subjects for Entry Grid
// 2. Get Students and Subjects for Entry Grid
exports.getstudentsandsubjectsformarks11ds = async (req, res) => {
    try {
        const { colid, semester, academicyear, section, term } = req.query;

        // Fetch Students
        const studentQuery = {
            colid: Number(colid),
            semester: semester
        };
        if (section) studentQuery.section = section;

        const students = await User.find(studentQuery)
            .select('regno name rollno')
            .sort({ rollno: 1, name: 1 });

        let subjects = [];
        let marks = [];

        // Check if it's attendance
        if (term === 'attendance') {
            subjects = [{
                subjectcode: 'ATTENDANCE',
                subjectname: 'Attendance',
                maxmarks: 0 // Not applicable
            }];

            marks = await StudentMarks11ds.find({
                colid: Number(colid),
                semester,
                academicyear,
                subjectcode: 'ATTENDANCE'
            });

        } else {
            // Fetch Configured Subjects
            subjects = await SubjectComponentConfig11ds.find({
                colid: Number(colid),
                semester,
                academicyear,
                isactive: true
            }).sort({ createdAt: 1 });

            // Fetch Existing Marks to populate the grid
            marks = await StudentMarks11ds.find({
                colid: Number(colid),
                semester,
                academicyear,
                subjectcode: { $ne: 'ATTENDANCE' }
            });
        }

        res.json({ success: true, students, subjects, marks });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 3. Save Marks
exports.savemarks11ds = async (req, res) => {
    try {
        const { marksData } = req.body; // Array of marks objects

        if (!marksData || !Array.isArray(marksData)) {
            return res.status(400).json({ success: false, message: "Invalid data format" });
        }

        const bulkOps = marksData.map(mark => {
            // Check if it's attendance
            if (mark.subjectcode === 'ATTENDANCE') {
                const updateFields = {
                    name: mark.name, // marks entry usually has student name/user details
                    user: mark.user,
                    studentname: mark.studentname,
                    subjectname: 'Attendance',
                    updatedat: new Date()
                };

                // Add specific attendance fields if present
                if (mark.term1totalpresentdays !== undefined) updateFields.term1totalpresentdays = mark.term1totalpresentdays;
                if (mark.term1totalworkingdays !== undefined) updateFields.term1totalworkingdays = mark.term1totalworkingdays;
                if (mark.term2totalpresentdays !== undefined) updateFields.term2totalpresentdays = mark.term2totalpresentdays;
                if (mark.term2totalworkingdays !== undefined) updateFields.term2totalworkingdays = mark.term2totalworkingdays;

                return {
                    updateOne: {
                        filter: {
                            colid: mark.colid,
                            regno: mark.regno,
                            subjectcode: 'ATTENDANCE',
                            semester: mark.semester,
                            academicyear: mark.academicyear
                        },
                        update: {
                            $set: updateFields,
                            $setOnInsert: { createdat: new Date() }
                        },
                        upsert: true
                    }
                };
            }

            // Standard Subject Logic
            const preMid = Number(mark.unitpremidobtain) || 0;
            const postMid = Number(mark.unitpostmidobtain) || 0;
            const unitTotalRaw = preMid + postMid;
            const unit20 = Number((unitTotalRaw * 0.2).toFixed(2));

            const hyTh = Number(mark.halfyearlythobtain) || 0;
            const hyPr = Number(mark.halfyearlypracticalobtain) || 0;
            const hyTotalRaw = hyTh + hyPr;
            const halfyearly30 = Number((hyTotalRaw * 0.3).toFixed(2));

            const annTh = Number(mark.annualthobtain) || 0;
            const annPr = Number(mark.annualpracticalobtain) || 0;
            const annTotalRaw = annTh + annPr;
            const annual50 = Number((annTotalRaw * 0.5).toFixed(2));

            const total = Number((unit20 + halfyearly30 + annual50).toFixed(2));
            const totalgrade = calculateGrade(total, 100);

            return {
                updateOne: {
                    filter: {
                        colid: mark.colid,
                        regno: mark.regno,
                        subjectcode: mark.subjectcode,
                        semester: mark.semester,
                        academicyear: mark.academicyear
                    },
                    update: {
                        $set: {
                            name: mark.name,
                            user: mark.user,
                            studentname: mark.studentname,
                            subjectname: mark.subjectname,

                            unitpremidobtain: preMid,
                            unitpostmidobtain: postMid,
                            unittotal: unitTotalRaw,
                            unit20: unit20,

                            halfyearlythobtain: hyTh,
                            halfyearlypracticalobtain: hyPr,
                            halfyearlytotal: hyTotalRaw,
                            halfyearly30: halfyearly30,

                            annualthobtain: annTh,
                            annualpracticalobtain: annPr,
                            annualtotal: annTotalRaw,
                            annual50: annual50,

                            total: total,
                            totalgrade: totalgrade,
                            status: 'finalized',
                            updatedat: new Date()
                        }
                    },
                    upsert: true
                }
            };
        });

        await StudentMarks11ds.bulkWrite(bulkOps);
        res.json({ success: true, message: "Marks saved successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 4. Get Data for PDF
exports.getMarksheetPDFData11ds = async (req, res) => {
    try {
        const { regno, colid, semester, academicyear } = req.query;

        // Fetch Student
        const student = await User.findOne({
            regno,
            colid: Number(colid)
        });

        if (!student) return res.status(404).json({ success: false, message: "Student not found" });

        // Fetch Marks (including ATTENDANCE)
        const marks = await StudentMarks11ds.find({
            regno,
            colid: Number(colid),
            semester,
            academicyear
        }).sort({ createdAt: 1 });

        // Extract Attendance
        const attRecord = marks.find(m => m.subjectcode === 'ATTENDANCE');
        // Filter out attendance from subjects list for display/calculation
        const subjectMarks = marks.filter(m => m.subjectcode !== 'ATTENDANCE');

        // Fetch Subject Configs to get REAL Names (in case Marks has codes)
        const subjectCodes = subjectMarks.map(m => m.subjectcode);
        // Filter by colid + semester + academicyear to get configs for this specific class only
        const subjectConfigs = await SubjectComponentConfig11ds.find({
            colid: Number(colid),
            semester,
            academicyear,
            subjectcode: { $in: subjectCodes }
        });

        //console.log("DEBUG: Looking for subjects:", subjectCodes);
        //console.log("DEBUG: Found configs:", subjectConfigs.length);
        //subjectConfigs.forEach(sc => console.log(`DEBUG: Config Code: ${sc.subjectcode}, Name: ${sc.subjectname}`));


        const codeToNameMap = {};
        subjectConfigs.forEach(sc => {
            codeToNameMap[sc.subjectcode] = sc.subjectname;
        });

        // Calculate Totals / Percentage
        let grandTotal = 0;
        let maxTotal = 0;
        let failCount = 0;

        const subjectsFormatted = subjectMarks.map(m => {
            grandTotal += (m.total || 0);
            maxTotal += 100; // Each subject is evaluated out of 100 weighted

            // Pass Criteria: Traditionally 33%.
            if ((m.total || 0) < 33) failCount++;

            // Use Config Name if available, else fallback to Marks Name
            let realSubjectName = codeToNameMap[m.subjectcode] || m.subjectname;

            // INTELLIGENT FIX: Check if the mapping inverted the Name/Code (User data issue)
            // If the Result (realSubjectName) looks like a Code (has numbers) 
            // AND the Input (m.subjectcode) looks like a Name (no numbers, len > 3), 
            // REVERT to the Input.
            const isResultCodeLike = /\d/.test(realSubjectName);
            const isInputNameLike = !/\d/.test(m.subjectcode) && m.subjectcode.length > 2;

            if (isResultCodeLike && isInputNameLike) {
                //console.log(`DEBUG: Reverting mapping for ${m.subjectcode}. Map gave ${realSubjectName} (Code-like) but Input is Name-like.`);
                realSubjectName = m.subjectcode; // Keep the name "Biology" instead of "BIO0011"
            }

            //console.log(`DEBUG: Final Name: ${realSubjectName}`);


            return {
                subjectname: realSubjectName,
                subjectcode: m.subjectcode,
                unitpremid: m.unitpremidobtain,
                unitpostmid: m.unitpostmidobtain,
                unitTotal: m.unittotal,
                unit20: m.unit20,

                hyTh: m.halfyearlythobtain,
                hyPr: m.halfyearlypracticalobtain,
                hyTotal: m.halfyearlytotal,
                hy30: m.halfyearly30,

                annTh: m.annualthobtain,
                annPr: m.annualpracticalobtain,
                annTotal: m.annualtotal,
                ann50: m.annual50,

                grandTotal: m.total,
                grade: m.totalgrade,
                compartmentobtained: (m.compartmentobtained !== undefined && m.compartmentobtained !== null)
                    ? m.compartmentobtained : null // Supplementary exam marks
            };
        });

        const percentage = maxTotal > 0 ? ((grandTotal / maxTotal) * 100).toFixed(2) : 0;
        const resultStatus = failCount === 0 ? "PASSED" : (failCount === 1 ? "COMPARTMENT" : "FAILED");

        // Build compartmentSubjects list
        const compartmentSubjects = subjectsFormatted
            .filter(s => !s.isadditional && (s.grandTotal || 0) < 33)
            .map(s => ({
                subjectname: s.subjectname,
                finalScore: s.grandTotal || 0,
                compartmentobtained: s.compartmentobtained // Supplementary exam marks
            }));
        // Dynamic Rank Calculation
        // Fetch all marks for the batch
        const allBatchMarks = await StudentMarks11ds.find({
            colid: Number(colid),
            semester,
            academicyear,
            subjectcode: { $ne: 'ATTENDANCE' }
        }).lean();

        // Group and Sum
        const studentTotals = {};
        allBatchMarks.forEach(m => {
            if (!studentTotals[m.regno]) studentTotals[m.regno] = 0;
            studentTotals[m.regno] += (m.total || 0);
        });

        // Convert to array and Sort Descending
        const sortedRanks = Object.keys(studentTotals).map(r => ({
            regno: r,
            total: studentTotals[r]
        })).sort((a, b) => b.total - a.total);

        // Find Rank
        const rankIndex = sortedRanks.findIndex(s => s.regno === regno);
        const rank = rankIndex !== -1 ? rankIndex + 1 : '-';

        const pdfData = {
            profile: {
                name: student.name,
                regno: student.regno,
                rollno: student.rollno,
                class: `${semester} - ${student.section || ''}`,
                father: student.fathername,
                mother: student.mothername,
                dob: student.dob,
                address: student.address,
                phone: student.phone,
                contact: student.phone,
                cbseRegNo: student.cbseno || '',   // CBSE Registration Number from User table
                photo: student.photo,

                // Attendance Data from Marks Collection
                term1attendance: attRecord ? (attRecord.term1totalpresentdays || 0) : 0,
                term1workingdays: attRecord ? (attRecord.term1totalworkingdays || 0) : 0,
                term2attendance: attRecord ? (attRecord.term2totalpresentdays || 0) : 0,
                term2workingdays: attRecord ? (attRecord.term2totalworkingdays || 0) : 0
            },
            subjects: subjectsFormatted,
            grandTotal,
            maxTotal,
            percentage,
            result: resultStatus,
            rank: rank,
            failCount,
            compartmentSubjects
        };


        res.json({ success: true, data: pdfData });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
// Save Subject Component Config 11ds
exports.saveSubjectComponentConfig11ds = async (req, res) => {
    try {
        const { id, colid, user, subjectcode, subjectname, semester, academicyear, unitpremid, unitpostmid, halfyearlyth, halfyearlypractical, annualth, annualpractical, isadditional } = req.body;

        const updateData = {
            colid: Number(colid),
            user,
            subjectcode,
            subjectname,
            semester,
            academicyear,
            unitpremid,
            unitpostmid,
            halfyearlyth,
            halfyearlypractical,
            annualth,
            annualpractical,
            isadditional,
            updatedat: new Date()
        };

        if (req.body.name) updateData.name = req.body.name; // subjectname map

        const filter = id ? { _id: id } : {
            colid: Number(colid),
            subjectcode: subjectcode,
            semester: semester,
            academicyear: academicyear
        };

        const options = { upsert: true, new: true, setDefaultsOnInsert: true };

        const result = await SubjectComponentConfig11ds.findOneAndUpdate(filter, updateData, options);

        res.json({
            success: true,
            message: 'Subject configuration saved successfully',
            data: result
        });
    } catch (error) {
        console.error('Error in saveSubjectComponentConfig11ds:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save subject configuration',
            error: error.message
        });
    }
};

// Start of getMarksheetPDFData11ds (existing) or End of file

