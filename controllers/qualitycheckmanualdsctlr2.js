const qualitycheckmanualds2 = require('../Models/qualitycheckmanualds2');

exports.addManualQC2 = async (req, res) => {
    try {
        const {
            deliveredToStore, vendorName, material, invoiceNo, chalanNo,
            modeOfSupply, supplyRemark, dateOfQualityCheck, initiatedBy,
            remark, documentLink, name, user, colid
        } = req.body;

        // Auto-generate srno: max srno for this colid + 1
        const lastRecord = await qualitycheckmanualds2.findOne({ colid }).sort({ srno: -1 });
        const srno = lastRecord ? (lastRecord.srno || 0) + 1 : 1;

        const newRecord = await qualitycheckmanualds2.create({
            srno, deliveredToStore, vendorName, material, invoiceNo, chalanNo,
            modeOfSupply, supplyRemark, dateOfQualityCheck, initiatedBy,
            remark, documentLink, name, user, colid
        });

        res.status(201).json({ success: true, data: newRecord });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getAllManualQC2 = async (req, res) => {
    try {
        const { user, colid } = req.query;
        const records = await qualitycheckmanualds2.find({ user, colid: Number(colid) }).sort({ srno: -1 });
        res.status(200).json({ success: true, data: records });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.updateManualQC2 = async (req, res) => {
    try {
        const {
            _id, deliveredToStore, vendorName, material, invoiceNo, chalanNo,
            modeOfSupply, supplyRemark, dateOfQualityCheck, initiatedBy, remark, documentLink
        } = req.body;

        const updated = await qualitycheckmanualds2.findByIdAndUpdate(_id, {
            deliveredToStore, vendorName, material, invoiceNo, chalanNo,
            modeOfSupply, supplyRemark, dateOfQualityCheck, initiatedBy, remark, documentLink
        }, { new: true });

        if (!updated) return res.status(404).json({ success: false, message: 'Record not found' });
        res.status(200).json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.deleteManualQC2 = async (req, res) => {
    try {
        const { id } = req.query;
        await qualitycheckmanualds2.findByIdAndDelete(id);
        res.status(200).json({ success: true, message: 'Record deleted' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
