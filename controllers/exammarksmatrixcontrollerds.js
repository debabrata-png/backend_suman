const Exammarks1ds = require('../Models/exammarks1ds');
const Exammarks2ds = require('../Models/exammarks2ds');
const ExamAdmit = require('../Models/examadmit');

exports.getMatrixFilters = async (req, res) => {
    try {
        const { colid, year, program, exam } = req.query;
        if (!colid) {
            return res.status(400).json({ status: "error", message: "College ID is required" });
        }

        let baseQuery = { colid: parseInt(colid) || colid };

        const years = await ExamAdmit.distinct('year', baseQuery);
        
        let progQuery = { ...baseQuery };
        if (year) progQuery.year = year;
        const programData = await ExamAdmit.aggregate([
            { $match: progQuery },
            { $group: { _id: { program: "$program", programcode: "$programcode" } } },
            { $project: { _id: 0, program: "$_id.program", programcode: "$_id.programcode" } },
            { $sort: { program: 1 } }
        ]);
        const programs = programData.filter(p => p.programcode);
        
        let examQuery = { ...baseQuery };
        if (year) examQuery.year = year;
        if (program) examQuery.programcode = program;
        const exams = await ExamAdmit.distinct('exam', examQuery);
        
        let ecQuery = { ...baseQuery };
        if (year) ecQuery.year = year;
        if (program) ecQuery.programcode = program;
        if (exam) ecQuery.exam = exam;
        const examcodes = await ExamAdmit.distinct('examcode', ecQuery);

        res.status(200).json({
            status: "success",
            data: {
                years: years.filter(Boolean),
                programs: programs.filter(Boolean),
                exams: exams.filter(Boolean),
                examcodes: examcodes.filter(Boolean)
            }
        });
    } catch (err) {
        console.error("Error fetching matrix filters:", err);
        res.status(500).json({ status: "error", message: "Internal server error" });
    }
};

exports.getExamMarksMatrixData = async (req, res) => {
    try {
        const { colid, year, program, exam, examcode } = req.query;

        if (!colid || !examcode) {
            return res.status(400).json({ status: "error", message: "colid and examcode are required" });
        }

        const numericColid = parseInt(colid) || colid;

        // Resolve program NAME from ExamAdmit using the programcode sent from frontend
        let programName = null;
        if (program) {
            const admitRecord = await ExamAdmit.findOne({ colid: numericColid, programcode: program });
            if (admitRecord && admitRecord.program) {
                programName = admitRecord.program;
            }
        }

        // 1. Fetch papers for this exam using program NAME (not code)
        let paperQuery = { colid: numericColid, examcode: examcode };
        if (year) paperQuery.year = year;
        if (programName) {
            paperQuery.$or = [{ program: programName }, { branch: programName }];
        }
        
        let papers = await Exammarks1ds.find(paperQuery).lean();
        
        // Fallback: if no papers found with program name, try without program filter
        if (papers.length === 0) {
            let relaxedQuery = { colid: numericColid, examcode: examcode };
            if (year) relaxedQuery.year = year;
            papers = await Exammarks1ds.find(relaxedQuery).lean();
        }

        // 2. Fetch distinct students assigned to this exam
        let admitQuery = { colid: colid, examcode: examcode };
        if (year) admitQuery.year = year;
        if (program) admitQuery.programcode = program;
        if (exam) admitQuery.exam = exam;

        const admits = await ExamAdmit.find(admitQuery).lean();
        
        // Extract unique students with their admit _id
        const studentMap = {};
        for (const admit of admits) {
            if (!studentMap[admit.regno]) {
                studentMap[admit.regno] = {
                    admitid: admit._id, // Exam Admit _id
                    student: admit.student,
                    regno: admit.regno
                };
            }
        }
        const students = Object.values(studentMap);

        // 3. Fetch existing marks for this examcode
        const marks = await Exammarks2ds.find({ colid: colid, examcode: examcode }).lean();

        res.status(200).json({ 
            status: "success", 
            data: { 
                papers, 
                students, 
                marks 
            } 
        });

    } catch (err) {
        console.error("Error fetching matrix data:", err);
        res.status(500).json({ status: "error", message: "Internal server error" });
    }
};

exports.saveExamMarksMatrix = async (req, res) => {
    try {
        const { marksData } = req.body;

        if (!marksData || !Array.isArray(marksData)) {
            return res.status(400).json({ status: "error", message: "marksData must be an array" });
        }

        for (const mark of marksData) {
            // Upsert into exammarks2ds
            const filter = { 
                colid: mark.colid, 
                regno: mark.regno, 
                examcode: mark.examcode,
                papercode: mark.papercode
            };

            await Exammarks2ds.findOneAndUpdate(
                filter,
                { $set: mark },
                { upsert: true, new: true }
            );
        }

        res.status(200).json({ status: "success", message: "Marks saved successfully" });

    } catch (err) {
        console.error("Error saving matrix data:", err);
        res.status(500).json({ status: "error", message: "Internal server error" });
    }
};
