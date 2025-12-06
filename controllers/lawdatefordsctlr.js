const lawdatefords = require('../Models/lawdatefords');

// Create Date For
exports.createdatefords = async (req, res) => {
    try {
        const { dateforname, colid, createduserid, createduseremail } = req.body;

        // Check for duplicate
        const existing = await lawdatefords.findOne({
            dateforname: { $regex: new RegExp(`^${dateforname}$`, 'i') },
            colid,
            isactive: true
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'Date For option already exists'
            });
        }

        const newDateFor = await lawdatefords.create({
            dateforname,
            colid,
            createduserid,
            createduseremail
        });

        res.status(201).json({
            success: true,
            message: 'Date For option created successfully',
            data: newDateFor
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error creating Date For option',
            error: error.message
        });
    }
};

// Get All Date For options
exports.getalldatefords = async (req, res) => {
    try {
        const { colid } = req.query;
        const dateForOptions = await lawdatefords.find({ colid, isactive: true }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: dateForOptions
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching Date For options',
            error: error.message
        });
    }
};

// Update Date For
exports.updatedatefords = async (req, res) => {
    try {
        const { id, dateforname } = req.body;

        // Get old date for name BEFORE updating
        const oldDateFor = await lawdatefords.findById(id).select('dateforname colid');

        if (!oldDateFor) {
            return res.status(404).json({
                success: false,
                message: 'Date For option not found'
            });
        }

        const updatedDateFor = await lawdatefords.findByIdAndUpdate(
            id,
            { dateforname },
            { new: true }
        );


        // Cascade update to all cases with this date for option
        const lawformds = require('../Models/lawformds');
        /* 
           We need to update the 'datefor' field which is an array of objects.
           We want to set 'datefor.$.datefor' = newName
           where 'datefor.dateforid' == id
        */
        const updateResult = await lawformds.updateMany(
            { "datefor.dateforid": id, colid: oldDateFor.colid },
            { $set: { "datefor.$.datefor": dateforname } }
        );

        res.status(200).json({
            success: true,
            message: 'Date For option updated successfully',
            data: updatedDateFor,
            casesUpdated: updateResult.modifiedCount
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating Date For option',
            error: error.message
        });
    }
};

// Delete Date For (Soft Delete)
exports.deletedatefords = async (req, res) => {
    try {
        const { id } = req.query;

        const deletedDateFor = await lawdatefords.findByIdAndUpdate(
            id,
            { isactive: false },
            { new: true }
        );

        if (!deletedDateFor) {
            return res.status(404).json({
                success: false,
                message: 'Date For option not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Date For option deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting Date For option',
            error: error.message
        });
    }
};
