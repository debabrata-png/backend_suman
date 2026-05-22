const poprintconfigds2 = require('../Models/poprintconfigds2');

exports.addpoprintconfigds2 = async (req, res) => {
    try {
        const config = await poprintconfigds2.create(req.body);
        res.status(201).json({ success: true, data: config });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getallpoprintconfigds2 = async (req, res) => {
    try {
        const { colid } = req.query;
        const configs = await poprintconfigds2.find({ colid }).sort({ _id: -1 });
        res.status(200).json({ success: true, data: configs });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.updatepoprintconfigds2 = async (req, res) => {
    try {
        const { id } = req.query;
        const config = await poprintconfigds2.findByIdAndUpdate(id, req.body, { new: true });
        res.status(200).json({ success: true, data: config });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.deletepoprintconfigds2 = async (req, res) => {
    try {
        const { id } = req.query;
        await poprintconfigds2.findByIdAndDelete(id);
        res.status(200).json({ success: true, message: 'Deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
