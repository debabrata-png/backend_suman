const Feeapplicationds = require('../Models/feeapplicationds');
const ExcelJS = require('exceljs');

// Get all application fees for a colid
exports.getFeeapplicationds = async (req, res) => {
    const { colid } = req.body;
    try {
        const fees = await Feeapplicationds.find({ colid: Number(colid) }).sort({ updatedAt: -1 });
        res.status(200).json({ success: true, data: fees });
    } catch (err) {
        console.error("Error fetching fees:", err);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// Create a new application fee
exports.createFeeapplicationds = async (req, res) => {
    try {
        if (req.body.colid) req.body.colid = Number(req.body.colid);
        const newFee = await Feeapplicationds.create(req.body);
        res.status(201).json({ success: true, data: newFee });
    } catch (err) {
        console.error("Error creating fee:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// Update application fee
exports.updateFeeapplicationds = async (req, res) => {
    const { id, colid } = req.body;
    try {
        const updated = await Feeapplicationds.findOneAndUpdate(
            { _id: id, colid: Number(colid) },
            req.body,
            { new: true }
        );
        if (!updated) return res.status(404).json({ success: false, message: "Record not found" });
        res.status(200).json({ success: true, data: updated });
    } catch (err) {
        console.error("Error updating fee:", err);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// Delete application fee
exports.deleteFeeapplicationds = async (req, res) => {
    const { id, colid } = req.body;
    try {
        const deleted = await Feeapplicationds.findOneAndDelete({ _id: id, colid: Number(colid) });
        if (!deleted) return res.status(404).json({ success: false, message: "Record not found" });
        res.status(200).json({ success: true, message: "Deleted successfully" });
    } catch (err) {
        console.error("Error deleting fee:", err);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// Bulk upload (JSON based)
exports.bulkUpload = async (req, res) => {
    const { data, colid, user } = req.body;
    if (!data || !Array.isArray(data)) {
        return res.status(400).json({ success: false, message: "Invalid data format" });
    }
    try {
        const formattedData = data.map(item => ({
            ...item,
            colid: Number(colid),
            user: user,
            classdate: item.classdate ? new Date(item.classdate) : new Date(),
            status: item.status || 'Active'
        }));
        await Feeapplicationds.insertMany(formattedData);
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
        const data = await Feeapplicationds.find({ colid: Number(colid) });
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Application Fees');

        worksheet.columns = [
            { header: 'Name', key: 'name', width: 25 },
            { header: 'Program Code', key: 'programcode', width: 20 },
            { header: 'Fee Group', key: 'feegroup', width: 20 },
            { header: 'Fee Item', key: 'feeeitem', width: 20 },
            { header: 'Semester', key: 'semester', width: 15 },
            { header: 'Academic Year', key: 'academicyear', width: 15 },
            { header: 'Fee Category', key: 'feecategory', width: 20 },
            { header: 'Student Type', key: 'studtype', width: 15 },
            { header: 'Domicile', key: 'domicile', width: 15 },
            { header: 'Fee Type', key: 'feetype', width: 15 },
            { header: 'Amount', key: 'amount', width: 15 },
            { header: 'Status', key: 'status', width: 15 }
        ];

        data.forEach(item => worksheet.addRow(item));

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=application_fees.xlsx');

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
            { header: 'name', key: 'name', width: 20 },
            { header: 'programcode', key: 'programcode', width: 20 },
            { header: 'feegroup', key: 'feegroup', width: 20 },
            { header: 'feeeitem', key: 'feeeitem', width: 20 },
            { header: 'semester', key: 'semester', width: 15 },
            { header: 'academicyear', key: 'academicyear', width: 15 },
            { header: 'feecategory', key: 'feecategory', width: 20 },
            { header: 'studtype', key: 'studtype', width: 15 },
            { header: 'domicile', key: 'domicile', width: 15 },
            { header: 'feetype', key: 'feetype', width: 15 },
            { header: 'amount', key: 'amount', width: 15 },
            { header: 'status', key: 'status', width: 15 },
            { header: 'classdate', key: 'classdate', width: 20 }
        ];

        worksheet.addRow({
            name: 'Application Fee',
            programcode: 'BTECH-CSE',
            feegroup: 'Registration',
            feeeitem: 'Form Fee',
            semester: '1',
            academicyear: '2026-27',
            feecategory: 'Regular',
            studtype: 'Regular',
            domicile: 'Inside',
            feetype: 'Standard',
            amount: 1500,
            status: 'Active',
            classdate: new Date().toISOString().split('T')[0]
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=application_fees_template.xlsx');

        await workbook.xlsx.write(res);
        res.status(200).end();
    } catch (err) {
        console.error("Error generating template:", err);
        res.status(500).send("Template generation failed");
    }
};
