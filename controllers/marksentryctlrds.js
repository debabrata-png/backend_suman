const ExamAdmit = require('../Models/examadmit');
const ExamNewRubrics1 = require('../Models/examnewrubrics1');
const ExamExt1 = require('../Models/examext1');
const ExamTotal1 = require('../Models/examtotal1');
const ExamMarks1DS = require('../Models/exammarks1ds');
const ExamMarks2DS = require('../Models/exammarks2ds');

exports.getmarksentrysheet = async (req, res) => {
    try {
        const { colid, year, examcode, programcode, semester, coursecode } = req.query;
        if (!colid) return res.status(400).json({ status: 'error', message: 'colid is required' });

        let query = { colid: parseInt(colid) || colid };
        if (year) query.year = year;
        if (examcode) query.examcode = examcode;
        if (programcode) query.programcode = programcode;
        if (semester) query.semester = semester;
        if (coursecode) query.coursecode = coursecode;

        // Fetch students eligible for this exact course and instance from proper Exam Admit records
        const students = await ExamAdmit.find(query).lean();
        
        // Remove duplicates if any
        const seen = new Set();
        const uniqueStudents = students.filter(s => {
            if (seen.has(s.regno)) return false;
            seen.add(s.regno);
            return true;
        });

        // Fetch existing rubrics and external marks
        const rubrics = await ExamNewRubrics1.find(query).lean();
        const ext = await ExamExt1.find(query).lean();

        // Merge existing marks into student payload
        const mergedList = uniqueStudents.map(student => {
            const rub = rubrics.find(r => r.regno === student.regno) || {};
            const ex = ext.find(e => e.regno === student.regno) || {};

            return {
                id: student._id.toString(), // DataGrid unique row id
                name: student.name,
                student: student.student,
                regno: student.regno,
                program: student.program,
                programcode: student.programcode,
                course: student.course,
                coursecode: student.coursecode,
                semester: student.semester,
                midtermscore: rub.midtermscore || 0,
                assignmentmarks: rub.assignmentmarks || 0,
                presentationmarks: rub.presentationmarks || 0,
                testmarks: rub.testmarks || 0,
                attendancemarks: rub.attendancemarks || 0,
                extmarks: ex.extmarks || 0
            };
        });

        res.json({ status: 'success', data: mergedList });

    } catch (err) {
        console.error('Error in getmarksentrysheet:', err);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

exports.savemarksentrysheet = async (req, res) => {
    try {
        const { colid, user, token, year, examcode, programcode, semester, coursecode, course, program, marksData, thmax, iatmax } = req.body;
        if (!colid || !marksData || !Array.isArray(marksData)) {
            return res.status(400).json({ status: 'error', message: 'Invalid data format' });
        }

        const _colid = parseInt(colid) || colid;

        // 1. First ensure the subject config exists in exammarks1ds (Needed for Tabulation!)
        let configRec = await ExamMarks1DS.findOne({ colid: _colid, examcode, papercode: coursecode });
        if (!configRec) {
            configRec = new ExamMarks1DS({
                name: 'MarksConfig',
                user: user || 'System',
                colid: _colid,
                program: program,
                examcode: examcode,
                year: year,
                semester: semester,
                papercode: coursecode,
                papername: course,
                thmax: Number(thmax) || 100,
                iatmax: Number(iatmax) || 50,
                prmax: 0,
                iapmax: 0,
                status: 'Submitted'
            });
            await configRec.save();
        } else {
             // Optional: update max marks if they changed them
             configRec.thmax = Number(thmax) || configRec.thmax;
             configRec.iatmax = Number(iatmax) || configRec.iatmax;
             await configRec.save();
        }

        // 2. Loop through all students synchronously to trigger schema pre-save calculation hooks securely.
        for (const data of marksData) {
            if (!data.regno) continue;

            const baseQuery = { colid: _colid, regno: data.regno, coursecode: data.coursecode, examcode: examcode };
            
            // --- A. ExamNewRubrics1 (Internal Marks) ---
            let rubrics = await ExamNewRubrics1.findOne(baseQuery);
            if (!rubrics) {
                rubrics = new ExamNewRubrics1({
                    colid: _colid, user: user, name: data.name || data.student,
                    student: data.student, regno: data.regno, program: data.program, programcode: data.programcode,
                    course: data.course, coursecode: data.coursecode, semester: data.semester,
                    examcode: examcode, type: 'Internal'
                });
            }
            rubrics.midtermscore = Number(data.midtermscore) || 0;
            rubrics.assignmentmarks = Number(data.assignmentmarks) || 0;
            rubrics.presentationmarks = Number(data.presentationmarks) || 0;
            rubrics.testmarks = Number(data.testmarks) || 0;
            rubrics.attendancemarks = Number(data.attendancemarks) || 0;
            
            // Calling .save() executes the pre('save') hook dynamically calculating 'ciamarks', 'modifiemidtermscore', 'totalmarks'
            const savedRubrics = await rubrics.save();

            // --- B. ExamExt1 (External Marks) ---
            let ext = await ExamExt1.findOne(baseQuery);
            if (!ext) {
                ext = new ExamExt1({
                    colid: _colid, user: user, name: data.name || data.student,
                    student: data.student, regno: data.regno, program: data.program, programcode: data.programcode,
                    course: data.course, coursecode: data.coursecode, semester: data.semester,
                    examcode: examcode, type: 'External'
                });
            }
            ext.extmarks = Number(data.extmarks) || 0;
            const savedExt = await ext.save();

            // --- C. ExamTotal1 (Calculates Pass/Fail and Grade) ---
            let tot = await ExamTotal1.findOne(baseQuery);
            if (!tot) {
                tot = new ExamTotal1({
                    colid: _colid, user: user, name: data.name || data.student,
                    student: data.student, regno: data.regno, program: data.program, programcode: data.programcode,
                    course: data.course, coursecode: data.coursecode, semester: data.semester,
                    examcode: examcode, year: year, type: 'Total'
                });
            }
            tot.intmarks = savedRubrics.totalmarks; // Grab calculated property directly from save hooks
            tot.extmarks = savedExt.extmarks;
            // The grade/pass logic executes via ExamTotal1 schema's pre('save')
            if (data.extmarks === 'Absent') {
                 tot.result = 'Absent';
            } else {
                 tot.result = ''; // clear absent flag to trigger normal calculation based on total
            }
            await tot.save();

            // --- D. ExamMarks2DS (Tabulation Register Sync) ---
            let stdRecord = await ExamMarks2DS.findOne({ colid: _colid, regno: data.regno, examcode: examcode, papercode: data.coursecode });
            if (!stdRecord) {
                stdRecord = new ExamMarks2DS({
                    name: data.name || data.student, user: user, colid: _colid,
                    student: data.student, regno: data.regno, program: data.program, 
                    examcode: examcode, year: year, semester: data.semester,
                    papercode: data.coursecode, papername: data.course, status: 'Submitted'
                });
            }
            stdRecord.thmax = configRec.thmax;
            stdRecord.iatmax = configRec.iatmax;
            stdRecord.thobtained = savedExt.extmarks;
            stdRecord.iatobtained = savedRubrics.totalmarks;
            await stdRecord.save();
        }

        res.json({ status: 'success', message: 'Marks saved successfully and Tabulation registered updated.' });
    } catch (err) {
        console.error('Error saving marks:', err);
        res.status(500).json({ status: 'error', message: 'Internal server error while saving marks' });
    }
};

// Filter to allow dynamic cascading dropdown selection in the Marks Entry UI
exports.getcoursefiltersformarks = async (req, res) => {
    try {
        const { colid } = req.query;
        const _colid = parseInt(colid) || colid;
        
        const aggregateResult = await ExamAdmit.aggregate([
            { $match: { colid: _colid, year: { $exists: true, $ne: "" }, examcode: { $exists: true, $ne: "" }, programcode: { $exists: true, $ne: "" }, coursecode: { $exists: true, $ne: "" } } },
            { 
                $group: { 
                    _id: { year: "$year", examcode: "$examcode", programcode: "$programcode", program: "$program", semester: "$semester", coursecode: "$coursecode", course: "$course" } 
                } 
            },
            {
                $project: {
                    _id: 0,
                    year: "$_id.year",
                    examcode: "$_id.examcode",
                    programcode: "$_id.programcode",
                    program: "$_id.program",
                    semester: "$_id.semester",
                    coursecode: "$_id.coursecode",
                    course: "$_id.course"
                }
            },
            { $sort: { year: -1, examcode: 1, coursecode: 1 } }
        ]);
        res.json({ status: 'success', data: aggregateResult });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
