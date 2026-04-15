const ExamStudentDS = require('../Models/examroomstudentds');
const ExamAdmit = require('../Models/examadmit');

exports.createexamstudentdsrecord = async (req, res) => {
    try {
        const { user, token, colid, name, studentname, studentregno, program, programcode, course, coursecode, exam, examcode, year, roomname, buildingname, examdate, examtime, status } = req.query;
        if (!colid) return res.status(400).json({ status: 'error', message: 'colid is required' });

        const newRecord = new ExamStudentDS({
            name: name || 'Unknown',
            user: user || 'Unknown',
            colid: colid,
            studentname: studentname,
            studentregno: studentregno,
            program: program,
            programcode: programcode,
            course: course,
            coursecode: coursecode,
            exam: exam,
            examcode: examcode,
            year: year,
            roomname: roomname,
            buildingname: buildingname,
            examdate: examdate,
            examtime: examtime,
            status: status || 'Submitted'
        });
        await newRecord.save();
        res.json({ status: 'success', message: 'Record created successfully' });
    } catch (err) {
        console.error('Error creating exam student ds:', err);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

exports.getexamstudentdsrecords = async (req, res) => {
    try {
        const { colid, user, token } = req.query;
        if (!colid) return res.status(400).json({ status: 'error', message: 'colid is required' });

        const records = await ExamStudentDS.find({ colid: colid }).sort({ _id: -1 });
        res.json({ status: 'success', data: { classes: records } });
    } catch (err) {
        console.error('Error fetching exam student ds:', err);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

exports.updateexamstudentdsrecord = async (req, res) => {
    try {
        const { id, user, token, colid, name, studentname, studentregno, program, programcode, course, coursecode, exam, examcode, year, roomname, buildingname, examdate, examtime, status } = req.body;
        if (!id) return res.status(400).json({ status: 'error', message: 'id is required' });

        await ExamStudentDS.findByIdAndUpdate(id, {
            name: name,
            user: user,
            colid: colid,
            studentname: studentname,
            studentregno: studentregno,
            program: program,
            programcode: programcode,
            course: course,
            coursecode: coursecode,
            exam: exam,
            examcode: examcode,
            year: year,
            roomname: roomname,
            buildingname: buildingname,
            examdate: examdate,
            examtime: examtime,
            status: status
        });
        res.json({ status: 'success', message: 'Record updated successfully' });
    } catch (err) {
        console.error('Error updating exam student ds:', err);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

exports.deleteexamstudentdsrecord = async (req, res) => {
    try {
        const { id, user, token } = req.query;
        if (!id) return res.status(400).json({ status: 'error', message: 'id is required' });

        await ExamStudentDS.findByIdAndDelete(id);
        res.json({ status: 'success', message: 'Record deleted successfully' });
    } catch (err) {
        console.error('Error deleting exam student ds:', err);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

// Load students from examadmit model
exports.getexamadmitstudentsds = async (req, res) => {
    try {
        const { colid, examcode, year } = req.query;
        if (!colid) return res.status(400).json({ status: 'error', message: 'colid is required' });

        const _colid = parseInt(colid) || colid;
        let query = { colid: _colid };
        if (examcode) query.examcode = examcode;
        if (year) query.year = year;

        const students = await ExamAdmit.find(query).lean();

        // Deduplicate by regno
        const seen = new Set();
        const uniqueStudents = students.filter(s => {
            if (seen.has(s.regno)) return false;
            seen.add(s.regno);
            return true;
        });

        res.json({ status: 'success', data: { students: uniqueStudents } });
    } catch (err) {
        console.error('Error fetching exam admit students:', err);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

exports.getexamstudentdscountbyyear = async (req, res) => {
    try {
        const { colid } = req.query;
        if (!colid) return res.status(400).json({ status: 'error', message: 'colid is required' });

        const _colid = parseInt(colid) || colid;
        const results = await ExamStudentDS.aggregate([
            { $match: { colid: _colid } },
            { $group: { _id: '$year', total_attendance: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);
        res.json({ status: 'success', data: { classes: results } });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

exports.getexamstudentdscountbyprogram = async (req, res) => {
    try {
        const { colid } = req.query;
        if (!colid) return res.status(400).json({ status: 'error', message: 'colid is required' });

        const _colid = parseInt(colid) || colid;
        const results = await ExamStudentDS.aggregate([
            { $match: { colid: _colid } },
            { $group: { _id: '$program', total_attendance: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);
        res.json({ status: 'success', data: { classes: results } });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
