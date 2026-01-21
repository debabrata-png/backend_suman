const vendords = require("../Models/vendords");

// Add single vendor
exports.addvendords = async (req, res) => {
    try {
        const { name, user, colid, vendorname, pan, gst, address, state, city, mobileno, email, type, doclink } = req.body;

        const newVendor = new vendords({
            name,
            user,
            colid,
            vendorname,
            pan,
            gst,
            address,
            state,
            city,
            mobileno,
            email,
            email,
            type,
            doclink
        });

        await newVendor.save();

        return res.status(201).json({
            success: true,
            message: "Vendor added successfully",
            data: newVendor
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error adding vendor",
            error: error.message
        });
    }
};

// Get all vendors
exports.getallvendords = async (req, res) => {
    try {
        const { colid } = req.query;
        const vendors = await vendords.find({ colid }).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: vendors.length,
            data: vendors
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching vendors",
            error: error.message
        });
    }
};

// Get vendor by ID
exports.getvendordsbyid = async (req, res) => {
    try {
        const { id } = req.query;
        const vendor = await vendords.findById(id);

        if (!vendor) {
            return res.status(404).json({
                success: false,
                message: "Vendor not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: vendor
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching vendor",
            error: error.message
        });
    }
};

// Update vendor
exports.updatevendords = async (req, res) => {
    try {
        const { id } = req.query;
        const updateData = req.body;

        const vendor = await vendords.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!vendor) {
            return res.status(404).json({
                success: false,
                message: "Vendor not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Vendor updated successfully",
            data: vendor
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error updating vendor",
            error: error.message
        });
    }
};

// Delete vendor
exports.deletevendords = async (req, res) => {
    try {
        const { id } = req.query;
        const vendor = await vendords.findByIdAndDelete(id);

        if (!vendor) {
            return res.status(404).json({
                success: false,
                message: "Vendor not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Vendor deleted successfully"
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error deleting vendor",
            error: error.message
        });
    }
};
