const approvalconfigds = require('../Models/approvalconfigds');

exports.addConfig = async (req, res) => {
    try {
        // Just create a new entry for each step configuration
        const newConfig = await approvalconfigds.create(req.body);
        res.status(200).json({ success: true, data: newConfig });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getConfig = async (req, res) => {
    try {
        const { colid, module } = req.query;
        // Fetch all steps for this module, sorted by step number
        const steps = await approvalconfigds.find({ colid, module }).sort({ stepNumber: 1 });
        res.status(200).json({ success: true, data: steps });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
