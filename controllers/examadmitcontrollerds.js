const Classenr = require('../Models/classenr1');
const ExamAdmit = require('../Models/examadmit');
const Exammarks1ds = require('../Models/exammarks1ds'); // Added for program name lookup
const ExamTimetable = require('../Models/examtimetable');

exports.getAdmitCard = async (req, res) => {
    try {
        const { regno } = req.params;
        const { colid } = req.query; // Expect colid in query params for GET

        if (!regno) {
            return res.status(400).json({ status: "error", message: "Registration number is required" });
        }
        if (!colid) {
            return res.status(400).json({ status: "error", message: "College ID (colid) is required" });
        }

        // 1. Fetch Student Details & Enrolled Courses
        const enrollments = await Classenr.find({
            regno: regno,
            colid: colid
        });

        if (!enrollments || enrollments.length === 0) {
            return res.status(404).json({ status: "error", message: "Student not found or no enrollments." });
        }

        // Extract student info from the first enrollment record
        const studentInfo = enrollments[0];

        // Get all course codes for this student
        const courseCodes = enrollments.map(enr => enr.coursecode);
        const uniqueCourseCodes = [...new Set(courseCodes)];

        // 2. Fetch Exam Schedule for these courses
        const exams = await ExamTimetable.find({
            coursecode: { $in: uniqueCourseCodes },
            colid: colid // Enforce colid
        });

        // 3. Map Data for Response
        const subjectDetails = exams.map(exam => ({
            subjectcode: exam.coursecode,
            subjectname: exam.course,
            examdate: exam.examdate,
            examtime: exam.examslot
        }));

        // 4. Construct Final Response
        const admitCardData = {
            studentname: studentInfo.student,
            regno: studentInfo.regno,
            program: studentInfo.program,
            semester: studentInfo.semester,
            examdate: exams.length > 0 ? exams[0].examdate : null,
            examCenter: "Main Campus",
            subjects: subjectDetails,
        };

        // Check if Admit Card is Released/Enabled in ExamAdmit
        const admitRecord = await ExamAdmit.findOne({ regno: regno, enabled: 'true', colid: colid });

        if (admitRecord) {
            // Example: examCenter might be specific in the release record
            // admitCardData.examCenter = admitRecord.examCenter; 
        }

        res.json(admitCardData);

    } catch (err) {
        console.error("Error fetching admit card:", err);
        res.status(500).json({ status: "error", message: "Internal server error" });
    }
};

exports.releaseAdmitCard = async (req, res) => {
    try {
        const { examCenter, colid, user, token } = req.body;

        if (!colid) {
            return res.status(400).json({ status: "error", message: "College ID is required" });
        }

        // Logic to release admit cards
        // For now, we are just returning success. 
        // In future, ensure 'colid' is used in any DB creation/update.

        res.json({ status: "success", message: "Admit cards release process initiated successfully." });

    } catch (err) {
        console.error("Error releasing admit card:", err);
        res.status(500).json({ status: "error", message: "Internal server error" });
    }
};

exports.getClassenrStudentsForExamAdmit = async (req, res) => {
    try {
        const { year, programcode, semester, colid } = req.query;

        if (!colid) {
            return res.status(400).json({ status: "error", message: "College ID (colid) is required" });
        }

        let query = { colid: colid };
        if (year) query.year = year;
        if (programcode) query.programcode = programcode;
        if (semester) query.semester = semester;

        const students = await Classenr.find(query);
        
        res.status(200).json({ status: "success", data: students });
    } catch (err) {
        console.error("Error fetching classenr students:", err);
        res.status(500).json({ status: "error", message: "Internal server error" });
    }
};

exports.getClassenrDistinctValuesForExamAdmit = async (req, res) => {
    try {
        const { colid, year, programcode } = req.query;

        if (!colid) {
            return res.status(400).json({ status: "error", message: "College ID (colid) is required" });
        }

        // Years are always filtered just by colid
        const _colid = parseInt(colid) || colid;
        const years = await Classenr.distinct('year', { colid: _colid });
        
        // Program codes filtered by colid and selected year
        let programQuery = { colid: _colid };
        if (year) programQuery.year = year;
        
        const programData = await Classenr.aggregate([
            { $match: programQuery },
            { $group: { _id: { program: "$program", programcode: "$programcode" } } },
            { $project: { _id: 0, program: "$_id.program", programcode: "$_id.programcode" } },
            { $sort: { program: 1 } }
        ]);

        // Enrichment: Fetch full names from ExamMarks1 (Structure) if available
        for (let p of programData) {
            if (p.programcode) {
                const structure = await Exammarks1ds.findOne({ 
                    colid: _colid, 
                    $or: [
                        { program: { $regex: p.programcode, $options: 'i' } },
                        { branch: { $regex: p.programcode, $options: 'i' } }
                    ]
                }).lean();
                if (structure && structure.program && structure.program.length > p.program.length) {
                    p.program = structure.program;
                }
            }
        }

        const programcodes = programData.filter(p => p.programcode);
        
        // Semesters filtered by colid, selected year, and selected programcode
        let semQuery = { colid: _colid };
        if (year) semQuery.year = year;
        if (programcode) semQuery.programcode = programcode;
        const semesters = await Classenr.distinct('semester', semQuery);

        res.status(200).json({ 
            status: "success", 
            data: { 
                years: years.filter(Boolean), 
                programcodes: programcodes, 
                semesters: semesters.filter(Boolean) 
            } 
        });
    } catch (err) {
        console.error("Error fetching distinct values for classenr:", err);
        res.status(500).json({ status: "error", message: "Internal server error" });
    }
};

exports.postStudentsToExamAdmit = async (req, res) => {
    try {
        const { students, exam, examcode, colid, user } = req.body;

        if (!colid) {
            return res.status(400).json({ status: "error", message: "College ID is required" });
        }
        if (!students || !Array.isArray(students) || students.length === 0) {
            return res.status(400).json({ status: "error", message: "Students array is required" });
        }

        let insertedCount = 0;
        let skippedCount = 0;

        // Pre-fetch all paper structures for the given exam and college
        // This allows us to dynamically map a student's coursecode to the correct Full Program Name
        const structures = await Exammarks1ds.find({ 
            colid: parseInt(colid) || colid,
            examcode: examcode
        }).lean();
        
        // Build a dynamic map of papercode -> program (Full Name)
        const courseToProgramMap = {};
        for (const s of structures) {
            if (s.papercode && s.program) {
                // E.g., courseToProgramMap['MEC101'] = 'Diploma & Engineering in Mechanical Engineering'
                courseToProgramMap[s.papercode] = s.program;
            }
        }

        for (const student of students) {
            let finalProgramName = student.program;
            
            // Look up the full name dynamically using the student's passing coursecode
            // This completely eliminates any need to hardcode branch names like "Mechanical"
            if (student.coursecode && courseToProgramMap[student.coursecode]) {
                finalProgramName = courseToProgramMap[student.coursecode];
            } else if (student.program && student.program.length < 5) {
                // Deep Fallback: if we still have a short code like "12", try to find any structure
                // for this exam that might match.
                const match = structures.find(s => s.program && s.program.toLowerCase().includes(student.program.toLowerCase()));
                if (match) {
                    finalProgramName = match.program;
                }
            }

            // Check if already exists exactly for this exam and student
            const existing = await ExamAdmit.findOne({
                colid: colid,
                year: student.year,
                programcode: student.programcode,
                semester: student.semester,
                examcode: examcode,
                student: student.student,
                regno: student.regno,
                coursecode: student.coursecode
            });

            if (!existing) {
                const newAdmit = new ExamAdmit({
                    name: student.name || student.student || 'Unknown',
                    user: user || student.user || 'Unknown',
                    colid: colid,
                    year: student.year,
                    exam: exam,
                    examcode: examcode,
                    program: finalProgramName,
                    programcode: student.programcode,
                    course: student.course,
                    coursecode: student.coursecode,
                    semester: student.semester,
                    student: student.student,
                    regno: student.regno,
                    enabled: 'false',
                    type: student.coursetype || student.type || 'Regular',
                    level: student.level || 'UG',
                    status1: 'Submitted',
                    comments: ''
                });
                await newAdmit.save();
                insertedCount++;
            } else {
                skippedCount++;
            }
        }

        res.status(200).json({ 
            status: "success", 
            message: `Successfully added ${insertedCount} records. Skipped ${skippedCount} duplicate records.` 
        });

    } catch (err) {
        console.error("Error posting to exam admit:", err);
        res.status(500).json({ status: "error", message: "Internal server error" });
    }
};

exports.getDistinctExamAdmitFilters = async (req, res) => {
    try {
        const { colid } = req.query;
        if (!colid) return res.status(400).json({ status: "error", message: "colid is required" });

        const _colid = parseInt(colid) || colid;

        // Fetch distinct combinations of year, examcode, exam
        const aggregateResult = await ExamAdmit.aggregate([
            { $match: { colid: _colid, year: { $exists: true, $ne: "" }, examcode: { $exists: true, $ne: "" } } },
            { 
                $group: { 
                    _id: { year: "$year", examcode: "$examcode", exam: "$exam" } 
                } 
            },
            {
                $project: {
                    _id: 0,
                    year: "$_id.year",
                    examcode: "$_id.examcode",
                    exam: "$_id.exam"
                }
            },
            { $sort: { year: -1, examcode: 1 } }
        ]);

        res.json({ status: "success", data: aggregateResult });
    } catch (err) {
        console.error("Error fetching distinct exam admit filters:", err);
        res.status(500).json({ status: "error", message: "Internal server error" });
    }
};
