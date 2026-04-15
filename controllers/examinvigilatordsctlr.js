const ExamInvigilatorDS = require('../Models/examinvigilatords');

exports.createexaminvigilatordsrecord = async (req, res) => {
    try {
        const { user, token, colid, name, invigilatorname, invigilatoremail, exam, examcode, year, roomname, buildingname, examdate, examtime, status } = req.query;
        if (!colid) return res.status(400).json({ status: 'error', message: 'colid is required' });

        const newRecord = new ExamInvigilatorDS({
            name: name || 'Unknown',
            user: user || 'Unknown',
            colid: colid,
            invigilatorname: invigilatorname,
            invigilatoremail: invigilatoremail,
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
        console.error('Error creating exam invigilator ds:', err);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

exports.getexaminvigilatordsrecords = async (req, res) => {
    try {
        const { colid, user, token } = req.query;
        if (!colid) return res.status(400).json({ status: 'error', message: 'colid is required' });

        const records = await ExamInvigilatorDS.find({ colid: colid }).sort({ _id: -1 });
        res.json({ status: 'success', data: { classes: records } });
    } catch (err) {
        console.error('Error fetching exam invigilator ds:', err);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

exports.updateexaminvigilatordsrecord = async (req, res) => {
    try {
        const { id, user, token, colid, name, invigilatorname, invigilatoremail, exam, examcode, year, roomname, buildingname, examdate, examtime, status } = req.body;
        if (!id) return res.status(400).json({ status: 'error', message: 'id is required' });

        await ExamInvigilatorDS.findByIdAndUpdate(id, {
            name: name,
            user: user,
            colid: colid,
            invigilatorname: invigilatorname,
            invigilatoremail: invigilatoremail,
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
        console.error('Error updating exam invigilator ds:', err);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

exports.deleteexaminvigilatordsrecord = async (req, res) => {
    try {
        const { id, user, token } = req.query;
        if (!id) return res.status(400).json({ status: 'error', message: 'id is required' });

        await ExamInvigilatorDS.findByIdAndDelete(id);
        res.json({ status: 'success', message: 'Record deleted successfully' });
    } catch (err) {
        console.error('Error deleting exam invigilator ds:', err);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};

exports.getexaminvigilatordscountbyyear = async (req, res) => {
    try {
        const { colid } = req.query;
        if (!colid) return res.status(400).json({ status: 'error', message: 'colid is required' });

        const _colid = parseInt(colid) || colid;
        const results = await ExamInvigilatorDS.aggregate([
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

exports.getexaminvigilatordscountbybuilding = async (req, res) => {
    try {
        const { colid } = req.query;
        if (!colid) return res.status(400).json({ status: 'error', message: 'colid is required' });

        const _colid = parseInt(colid) || colid;
        const results = await ExamInvigilatorDS.aggregate([
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
