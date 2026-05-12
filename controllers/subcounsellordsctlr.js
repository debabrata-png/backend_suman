const subcounsellords = require('../Models/subcounsellords.js');

// Fetch sub-counselors assigned to a counselor
exports.getsubcounselorsbycounselords = async (req, res) => {
    try {
        const { colid, counselloremail } = req.query;

        if (!colid || !counselloremail) {
            return res.status(400).json({ success: false, message: 'colid and counselloremail are required' });
        }

        const subCounselors = await subcounsellords.find({
            colid: Number(colid),
            counselloremail: counselloremail
        });

        res.status(200).json({ success: true, data: subCounselors });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Create mapping (optional but good for future)
exports.createsubcounsellords = async (req, res) => {
    try {
        req.body.colid = Number(req.body.colid);
        const mapping = await subcounsellords.create(req.body);
        res.status(201).json({ success: true, data: mapping });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
// Fetch all sub-counselor mappings (filtered by colid)
exports.getallsubcounsellords = async (req, res) => {
    try {
        const { colid } = req.query;
        const filter = colid ? { colid: Number(colid) } : {};
        const mappings = await subcounsellords.find(filter);
        res.status(200).json({ success: true, data: mappings });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Update a mapping
exports.updatesubcounsellords = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) return res.status(400).json({ success: false, message: 'ID is required' });
        
        const updated = await subcounsellords.findByIdAndUpdate(id, req.body, { new: true });
        res.status(200).json({ success: true, data: updated });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Delete a mapping
exports.deletesubcounsellords = async (req, res) => {
    try {
        const { id } = req.params;
        await subcounsellords.findByIdAndDelete(id);
        res.status(200).json({ success: true, message: 'Deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
