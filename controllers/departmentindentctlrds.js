const DepartmentIndentds = require('../Models/departmentindentds');
const ExcelJS = require('exceljs');

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
        const formattedData = data.map(item => ({
            ...item,
            colid: Number(colid),
            creatoruserid: user,
            creatorname: name,
            user: user,
            status: item.status || 'Pending'
        }));
        await DepartmentIndentds.insertMany(formattedData);
        res.status(200).json({ success: true, message: "Bulk upload successful" });
    } catch (err) {
        console.error("Error in bulk upload:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// Export data to Excel
exports.exportData = async (req, res) => {
    const { colid } = req.query;
    try {
        const data = await DepartmentIndentds.find({ colid: Number(colid) });
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Department Indents');

        worksheet.columns = [
            { header: 'Name', key: 'name', width: 25 },
            { header: 'Department', key: 'departmentname', width: 25 },
            { header: 'Institution', key: 'institution', width: 20 },
            { header: 'Creator Name', key: 'creatorname', width: 20 },
            { header: 'HOI Approver', key: 'hoiapprovername', width: 20 },
            { header: 'Assistant HOI', key: 'ahoiapprovername', width: 20 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Remarks', key: 'remarks', width: 30 }
        ];

        data.forEach(item => worksheet.addRow(item));

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=department_indents.xlsx');

        await workbook.xlsx.write(res);
        res.status(200).end();
    } catch (err) {
        console.error("Error exporting data:", err);
        res.status(500).send("Export failed");
    }
};

// Download template
exports.downloadTemplate = async (req, res) => {
    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Template');

        worksheet.columns = [
            { header: 'departmentname', key: 'departmentname', width: 25 },
            { header: 'institution', key: 'institution', width: 20 },
            { header: 'institutionshort', key: 'institutionshort', width: 15 },
            { header: 'hoiapprovername', key: 'hoiapprovername', width: 20 },
            { header: 'hoiapproveruserid', key: 'hoiapproveruserid', width: 25 },
            { header: 'ahoiapprovername', key: 'ahoiapprovername', width: 20 },
            { header: 'ahoiapproveruserid', key: 'ahoiapproveruserid', width: 25 },
            { header: 'remarks', key: 'remarks', width: 30 },
            { header: 'status', key: 'status', width: 15 }
        ];

        // Add a sample row
        worksheet.addRow({
            departmentname: 'CSE',
            institution: 'Sample Institution',
            institutionshort: 'SI',
            hoiapprovername: 'Approver Name',
            hoiapproveruserid: 'approver@email.com',
            ahoiapprovername: 'Asst. Approver',
            ahoiapproveruserid: 'asst@email.com',
            remarks: 'Bulk upload sample',
            status: 'Pending'
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=department_indent_template.xlsx');

        await workbook.xlsx.write(res);
        res.status(200).end();
    } catch (err) {
        console.error("Error generating template:", err);
        res.status(500).send("Template generation failed");
    }
};
