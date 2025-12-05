const lawopponentclerkds = require('../Models/lawopponentclerkds');

// Create Opponent Clerk
exports.createlawopponentclerkds = async (req, res) => {
    try {
        const { name, user, colid, oppclerkname, oppclerkemail, oppclerkphone, oppclerkaddress } = req.body;

        // Check if opponent clerk email already exists for this college (if email provided)
        if (oppclerkemail) {
            const existingClerk = await lawopponentclerkds.findOne({
                oppclerkemail,
                colid: parseInt(colid),
                isactive: true
            });

            if (existingClerk) {
                return res.status(400).json({
                    success: false,
                    message: 'Opponent clerk with this email already exists'
                });
            }
        }

        const newClerk = await lawopponentclerkds.create({
            name,
            user,
            colid,
            oppclerkname,
            oppclerkemail,
            oppclerkphone,
            oppclerkaddress
        });

        res.status(201).json({
            success: true,
            message: 'Opponent clerk created successfully',
            data: newClerk
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error creating opponent clerk',
            error: error.message
        });
    }
};

// Get All Opponent Clerks
exports.getalllawopponentclerkds = async (req, res) => {
    try {
        const { colid } = req.query;

        const clerks = await lawopponentclerkds.find({
            colid: parseInt(colid),
            isactive: true
        }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: clerks
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching opponent clerks',
            error: error.message
        });
    }
};

// Get Opponent Clerk By ID
exports.getlawopponentclerkdsbyid = async (req, res) => {
    try {
        const { id } = req.query;

        const clerk = await lawopponentclerkds.findById(id);

        if (!clerk) {
            return res.status(404).json({
                success: false,
                message: 'Opponent clerk not found'
            });
        }

        res.status(200).json({
            success: true,
            data: clerk
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching opponent clerk',
            error: error.message
        });
    }
};

// Update Opponent Clerk
exports.updatelawopponentclerkds = async (req, res) => {
    try {
        const { id, oppclerkname, oppclerkemail, oppclerkphone, oppclerkaddress } = req.body;

        // Get old email BEFORE updating
        const oldClerk = await lawopponentclerkds.findById(id).select('oppclerkemail colid');

        if (!oldClerk) {
            return res.status(404).json({
                success: false,
                message: 'Opponent clerk not found'
            });
        }

        const updatedClerk = await lawopponentclerkds.findByIdAndUpdate(
            id,
            { oppclerkname, oppclerkemail, oppclerkphone, oppclerkaddress },
            { new: true }
        );


        // Cascade update to all cases with this opponent clerk
        const lawformds = require('../Models/lawformds');
        const updateResult = await lawformds.updateMany(
            { opponentclerkemail: oldClerk.oppclerkemail, colid: oldClerk.colid },
            {
                $set: {
                    opponentclerkname: oppclerkname,
                    opponentclerkemail: oppclerkemail,
                    opponentclerkphone: oppclerkphone
                }
            }
        );

        res.status(200).json({
            success: true,
            message: 'Opponent clerk updated successfully',
            data: updatedClerk,
            casesUpdated: updateResult.modifiedCount
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating opponent clerk',
            error: error.message
        });
    }
};

// Delete Opponent Clerk (Soft Delete)
exports.deletelawopponentclerkds = async (req, res) => {
    try {
        const { id } = req.query;

        const deletedClerk = await lawopponentclerkds.findByIdAndUpdate(
            id,
            { isactive: false },
            { new: true }
        );

        if (!deletedClerk) {
            return res.status(404).json({
                success: false,
                message: 'Opponent clerk not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Opponent clerk deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting opponent clerk',
            error: error.message
        });
    }
};
