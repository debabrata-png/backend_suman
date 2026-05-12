const ExamRoomDS = require('../Models/examroomds');

exports.createexamroomdsrecord = async (req, res) => {
    try {
        const { user, token, colid, name, exam, examcode, year, roomname, buildingname, examdate, status } = req.query;
        if (!colid) return res.status(400).json({ status: 'error', message: 'colid is required' });

        const newRecord = new ExamRoomDS({
            name: name || 'Unknown',
            user: user || 'Unknown',
            colid: colid,
            exam: exam,
            examcode: examcode,
            year: year,
            roomname: roomname,
            buildingname: buildingname,
            examdate: examdate,
            status: status || 'Submitted'
        });
        await newRecord.save();
        res.json({ status: 'success', message: 'Record created successfully' });
    } catch (err) {
        console.error('Error creating exam room ds:', err);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

exports.getexamroomdsrecords = async (req, res) => {
    try {
        const { colid, user, token } = req.query;
        if (!colid) return res.status(400).json({ status: 'error', message: 'colid is required' });

        const records = await ExamRoomDS.find({ colid: colid }).sort({ _id: -1 });
        res.json({ status: 'success', data: { classes: records } });
    } catch (err) {
        console.error('Error fetching exam room ds:', err);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

exports.updateexamroomdsrecord = async (req, res) => {
    try {
        const { id, user, token, colid, name, exam, examcode, year, roomname, buildingname, examdate, status } = req.body;
        if (!id) return res.status(400).json({ status: 'error', message: 'id is required' });

        await ExamRoomDS.findByIdAndUpdate(id, {
            name: name,
            user: user,
            colid: colid,
            exam: exam,
            examcode: examcode,
            year: year,
            roomname: roomname,
            buildingname: buildingname,
            examdate: examdate,
            status: status
        });
        res.json({ status: 'success', message: 'Record updated successfully' });
    } catch (err) {
        console.error('Error updating exam room ds:', err);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

exports.deleteexamroomdsrecord = async (req, res) => {
    try {
        const { id, user, token } = req.query;
        if (!id) return res.status(400).json({ status: 'error', message: 'id is required' });

        await ExamRoomDS.findByIdAndDelete(id);
        res.json({ status: 'success', message: 'Record deleted successfully' });
    } catch (err) {
        console.error('Error deleting exam room ds:', err);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

exports.getexamroomdscountbyyear = async (req, res) => {
    try {
        const { colid, user, token } = req.query;
        if (!colid) return res.status(400).json({ status: 'error', message: 'colid is required' });

        const _colid = parseInt(colid) || colid;
        const results = await ExamRoomDS.aggregate([
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

exports.getexamroomdscountbybuilding = async (req, res) => {
    try {
        const { colid, user, token } = req.query;
        if (!colid) return res.status(400).json({ status: 'error', message: 'colid is required' });

        const _colid = parseInt(colid) || colid;
        const results = await ExamRoomDS.aggregate([
            { $match: { colid: _colid } },
            { $group: { _id: '$buildingname', total_attendance: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);
        res.json({ status: 'success', data: { classes: results } });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
