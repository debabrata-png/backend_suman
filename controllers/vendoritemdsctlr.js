const vendoritemds = require("../Models/vendoritemds");

exports.addvendoritemds = async (req, res) => {
    try {
        // vendorname, vendorid, itemid, item, price, discount, status, type
        const newItem = await vendoritemds.create(req.body);
        res.status(201).json({
            success: true,
            message: "Vendor Item added successfully",
            data: newItem
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error adding vendor item",
            error: error.message
        });
    }
};

exports.getallvendoritemds = async (req, res) => {
    try {
        const { colid } = req.query;
        const vendorItems = await vendoritemds.find({ colid });
        res.status(200).json({
            success: true,
            count: vendorItems.length,
            data: { vendorItems }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching vendor items",
            error: error.message
        });
    }
};

exports.updatevendoritemds = async (req, res) => {
    try {
        const { id } = req.query;
        const updatedItem = await vendoritemds.findByIdAndUpdate(id, req.body, { new: true });
        if (!updatedItem) return res.status(404).json({ success: false, message: "Item not found" });
        res.status(200).json({
            success: true,
            message: "Vendor Item updated",
            data: updatedItem
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error updating vendor item",
            error: error.message
        });
    }
};

exports.deletevendoritemds = async (req, res) => {
    try {
        const { id } = req.query;
        await vendoritemds.findByIdAndDelete(id);
        res.status(200).json({ success: true, message: "Vendor Item deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error deleting vendor item", error: error.message });
    }
};

exports.getvendoritemdsbyid = async (req, res) => {
    try {
        const { id } = req.query;
        const item = await vendoritemds.findById(id);
        if (!item) return res.status(404).json({ success: false, message: "Item not found" });
        res.status(200).json({ success: true, data: item });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching item", error: error.message });
    }
};
