const DepartmentIndentds = require('../Models/departmentindentds');

// Get all indents for a colid
exports.getDepartmentIndentds = async (req, res) => {
    const { colid } = req.body;
    try {
        const indents = await DepartmentIndentds.find({ colid: Number(colid) }).sort({ updatedAt: -1 });
        res.status(200).json({ success: true, data: indents });
    } catch (err) {
        console.error("Error fetching indents:", err);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// Create a new indent
exports.createDepartmentIndentds = async (req, res) => {
    try {
        if (req.body.colid) req.body.colid = Number(req.body.colid);
        const newIndent = await DepartmentIndentds.create({
            ...req.body,
            status: req.body.status || 'Pending'
        });
        res.status(201).json({ success: true, data: newIndent });
    } catch (err) {
        console.error("Error creating indent:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// Update indent
exports.updateDepartmentIndentds = async (req, res) => {
    const { id } = req.body;
    try {
        const updated = await DepartmentIndentds.findByIdAndUpdate(
            id,
            req.body,
            { new: true }
        );
        if (!updated) return res.status(404).json({ success: false, message: "Record not found" });
        res.status(200).json({ success: true, data: updated });
    } catch (err) {
        console.error("Error updating indent:", err);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// Delete indent
exports.deleteDepartmentIndentds = async (req, res) => {
    const { id } = req.body;
    try {
        const deleted = await DepartmentIndentds.findByIdAndDelete(id);
        if (!deleted) return res.status(404).json({ success: false, message: "Record not found" });
        res.status(200).json({ success: true, message: "Deleted successfully" });
    } catch (err) {
        console.error("Error deleting indent:", err);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// Bulk upload
exports.bulkUpload = async (req, res) => {
    const { data, colid, user, name } = req.body;
    if (!data || !Array.isArray(data)) {
        return res.status(400).json({ success: false, message: "Invalid data format" });
    }
    try {
        const formattedData = data.map(item => {
            return {
                ...item,
                colid: Number(colid),
                user: user, // Mandatory: Person uploading the record
                name: name, // Mandatory: Person uploading the record
                status: item.status || 'Active'
            };
        });
        await DepartmentIndentds.insertMany(formattedData);
        res.status(200).json({ success: true, message: "Bulk upload successful" });
    } catch (err) {
        console.error("Error in bulk upload:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};
