const ExamAttendanceDS = require('../Models/examattendanceds');

exports.createexamattendancedsrecord = async (req, res) => {
    try {
        const { user, token, colid, name, studentname, studentregno, program, programcode, course, coursecode, exam, examcode, year, roomname, buildingname, examdate, examtime, status } = req.query;
        if (!colid) return res.status(400).json({ status: 'error', message: 'colid is required' });

        const newRecord = new ExamAttendanceDS({
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
        console.error('Error creating exam attendance ds:', err);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

exports.getexamattendancedsrecords = async (req, res) => {
    try {
        const { colid, user, token } = req.query;
        if (!colid) return res.status(400).json({ status: 'error', message: 'colid is required' });

        const records = await ExamAttendanceDS.find({ colid: colid }).sort({ _id: -1 });
        res.json({ status: 'success', data: { classes: records } });
    } catch (err) {
        console.error('Error fetching exam attendance ds:', err);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

exports.updateexamattendancedsrecord = async (req, res) => {
    try {
        const { id, user, token, colid, name, studentname, studentregno, program, programcode, course, coursecode, exam, examcode, year, roomname, buildingname, examdate, examtime, status } = req.body;
        if (!id) return res.status(400).json({ status: 'error', message: 'id is required' });

        await ExamAttendanceDS.findByIdAndUpdate(id, {
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
        console.error('Error updating exam attendance ds:', err);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

exports.deleteexamattendancedsrecord = async (req, res) => {
    try {
        const { id, user, token } = req.query;
        if (!id) return res.status(400).json({ status: 'error', message: 'id is required' });

        await ExamAttendanceDS.findByIdAndDelete(id);
        res.json({ status: 'success', message: 'Record deleted successfully' });
    } catch (err) {
        console.error('Error deleting exam attendance ds:', err);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

exports.getexamattendancedscountbyyear = async (req, res) => {
    try {
        const { colid } = req.query;
        if (!colid) return res.status(400).json({ status: 'error', message: 'colid is required' });

        const _colid = parseInt(colid) || colid;
        const results = await ExamAttendanceDS.aggregate([
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

exports.getexamattendancedscountbyprogram = async (req, res) => {
    try {
        const { colid } = req.query;
        if (!colid) return res.status(400).json({ status: 'error', message: 'colid is required' });

        const _colid = parseInt(colid) || colid;
        const results = await ExamAttendanceDS.aggregate([
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

const ExamStudentDS = require('../Models/examroomstudentds');

exports.getexamroomattendancelist = async (req, res) => {
    try {
        const { colid, year, examcode, exam, roomname } = req.query;
        if (!colid) return res.status(400).json({ status: 'error', message: 'colid is required' });

        const _colid = parseInt(colid) || colid;
        
        let query = { colid: _colid };
        if (year) query.year = year;
        if (examcode) query.examcode = examcode;
        if (exam) query.exam = exam;
        if (roomname) query.roomname = roomname;

        // Fetch allocated students for this room criteria
        const allocatedStudents = await ExamStudentDS.find(query).lean();

        // Fetch existing attendance records for the same criteria
        const attendanceRecords = await ExamAttendanceDS.find(query).lean();
        
        // Map attendance state: default ispresent='true'
        const mergedList = allocatedStudents.map(student => {
            const attended = attendanceRecords.find(a => a.studentregno === student.studentregno);
            return {
                ...student,
                ispresent: attended ? (attended.ispresent === 'true' || attended.ispresent === true ? 'true' : 'false') : 'true'
            };
        });

        res.json({ status: 'success', data: mergedList });
    } catch (err) {
        console.error('Error fetching exam room attendance list:', err);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

exports.upsertattendance = async (req, res) => {
    try {
        const { colid, user, token, name, studentname, studentregno, program, programcode, course, coursecode, exam, examcode, year, roomname, buildingname, examdate, examtime, ispresent } = req.body;
        if (!colid || !studentregno) return res.status(400).json({ status: 'error', message: 'colid and studentregno are required' });

        const _colid = parseInt(colid) || colid;

        // Prepare query for upserting based on unique combination of student and exam instance
        const query = { colid: _colid, studentregno, examcode, year };
        
        const updateData = {
            name: name || 'Unknown',
            user: user || 'Unknown',
            colid: _colid,
            studentname, studentregno, program, programcode, course, coursecode,
            exam, examcode, year, roomname, buildingname, examdate, examtime,
            ispresent: ispresent ? 'true' : 'false',
            status: 'Submitted'
        };

        await ExamAttendanceDS.findOneAndUpdate(query, updateData, { upsert: true, new: true, setDefaultsOnInsert: true });
        
        res.json({ status: 'success', message: 'Attendance updated successfully' });
    } catch (err) {
        console.error('Error upserting exam attendance:', err);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
