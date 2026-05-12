const lawopponentlawyerds = require('../Models/lawopponentlawyerds');

// Create Opponent Lawyer
exports.createlawopponentlawyerds = async (req, res) => {
    try {
        const { name, user, colid, opplawyername, opplawyeremail, opplawyerphone, opplawyeraddress } = req.body;

        // Check if opponent lawyer email already exists for this college (if email provided)
        if (opplawyeremail) {
            const existingLawyer = await lawopponentlawyerds.findOne({
                opplawyeremail,
                colid: parseInt(colid),
                isactive: true
            });

            if (existingLawyer) {
                return res.status(400).json({
                    success: false,
                    message: 'Opponent lawyer with this email already exists'
                });
            }
        }

        const newLawyer = await lawopponentlawyerds.create({
            name,
            user,
            colid,
            opplawyername,
            opplawyeremail,
            opplawyerphone,
            opplawyeraddress
        });

        res.status(201).json({
            success: true,
            message: 'Opponent lawyer created successfully',
            data: newLawyer
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error creating opponent lawyer',
            error: error.message
        });
    }
};

// Get All Opponent Lawyers
exports.getalllawopponentlawyerds = async (req, res) => {
    try {
        const { colid } = req.query;

        const lawyers = await lawopponentlawyerds.find({
            colid: parseInt(colid),
            isactive: true
        }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: lawyers
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching opponent lawyers',
            error: error.message
        });
    }
};

// Get Opponent Lawyer By ID
exports.getlawopponentlawyerdsbyid = async (req, res) => {
    try {
        const { id } = req.query;

        const lawyer = await lawopponentlawyerds.findById(id);

        if (!lawyer) {
            return res.status(404).json({
                success: false,
                message: 'Opponent lawyer not found'
            });
        }

        res.status(200).json({
            success: true,
            data: lawyer
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching opponent lawyer',
            error: error.message
        });
    }
};

// Update Opponent Lawyer
exports.updatelawopponentlawyerds = async (req, res) => {
    try {
        const { id, opplawyername, opplawyeremail, opplawyerphone, opplawyeraddress } = req.body;

        // Get old email BEFORE updating
        const oldLawyer = await lawopponentlawyerds.findById(id).select('opplawyeremail colid');

        if (!oldLawyer) {
            return res.status(404).json({
                success: false,
                message: 'Opponent lawyer not found'
            });
        }

        const updatedLawyer = await lawopponentlawyerds.findByIdAndUpdate(
            id,
            { opplawyername, opplawyeremail, opplawyerphone, opplawyeraddress },
            { new: true }
        );


        // Cascade update to all cases with this opponent lawyer
        const lawformds = require('../Models/lawformds');
        const updateResult = await lawformds.updateMany(
            { opponentlawyeremail: oldLawyer.opplawyeremail, colid: oldLawyer.colid },
            {
                $set: {
                    opponentlawyername: opplawyername,
                    opponentlawyeremail: opplawyeremail,
                    opponentlawyerphone: opplawyerphone
                }
            }
        );

        res.status(200).json({
            success: true,
            message: 'Opponent lawyer updated successfully',
            data: updatedLawyer,
            casesUpdated: updateResult.modifiedCount
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating opponent lawyer',
            error: error.message
        });
    }
};

// Delete Opponent Lawyer (Soft Delete)
exports.deletelawopponentlawyerds = async (req, res) => {
    try {
        const { id } = req.query;

        const deletedLawyer = await lawopponentlawyerds.findByIdAndUpdate(
            id,
            { isactive: false },
            { new: true }
        );

        if (!deletedLawyer) {
            return res.status(404).json({
                success: false,
                message: 'Opponent lawyer not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Opponent lawyer deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting opponent lawyer',
            error: error.message
        });
    }
};
