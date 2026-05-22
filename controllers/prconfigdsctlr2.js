const prconfigds2 = require('../Models/prconfigds2');

exports.addprconfigds2 = async (req, res) => {
    try {
        const newConfig = await prconfigds2.create(req.body);
        res.status(201).json({
            success: true,
            data: newConfig
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

exports.getprconfigds2 = async (req, res) => {
    try {
        const { colid, storeid } = req.query;
        let query = { colid };
        
        if (storeid && storeid !== 'global') {
            query.storeid = storeid;
        } else {
            // Find global config (where storeid does not exist or is null)
            query.$or = [{ storeid: { $exists: false } }, { storeid: null }, { storeid: "" }];
        }
        
        let config = await prconfigds2.findOne(query).sort({ _id: -1 });
        
        // If searching for a specific store and not found, fallback to global config
        if (!config && storeid && storeid !== 'global') {
            config = await prconfigds2.findOne({ colid, $or: [{ storeid: { $exists: false } }, { storeid: null }, { storeid: "" }] }).sort({ _id: -1 });
        }
        
        res.status(200).json({
            success: true,
            data: config
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

exports.updateprconfigds2 = async (req, res) => {
    try {
        const { id } = req.query;
        const updatedConfig = await prconfigds2.findByIdAndUpdate(id, req.body, { new: true });
        res.status(200).json({
            success: true,
            data: updatedConfig
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
