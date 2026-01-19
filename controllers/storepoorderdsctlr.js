const storepoorderds = require("../Models/storepoorderds");

exports.addstorepoorderds = async (req, res) => {
    try {
        // year, vendor, vendorid, poid, price, description, returnamount, netprice, updatedate, postatus
        const newPO = await storepoorderds.create(req.body);
        res.status(201).json({
            success: true,
            message: "Store PO added successfully",
            data: newPO
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error adding store PO",
            error: error.message
        });
    }
};

exports.getallstorepoorderds = async (req, res) => {
    try {
        const { colid } = req.query;
        const poOrders = await storepoorderds.find({ colid }).sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            count: poOrders.length,
            data: { poOrders }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching store POs",
            error: error.message
        });
    }
};

exports.updatestorepoorderds = async (req, res) => {
    try {
        const { id } = req.query;
        const updatedPO = await storepoorderds.findByIdAndUpdate(id, req.body, { new: true });
        if (!updatedPO) return res.status(404).json({ success: false, message: "PO not found" });
        res.status(200).json({
            success: true,
            message: "PO updated",
            data: updatedPO
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error updating PO",
            error: error.message
        });
    }
};

exports.deletestorepoorderds = async (req, res) => {
    try {
        const { id } = req.query;
        await storepoorderds.findByIdAndDelete(id);
        res.status(200).json({ success: true, message: "PO deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error deleting PO", error: error.message });
    }
};

exports.getstorepoorderdsbyid = async (req, res) => {
    try {
        const { id } = req.query;
        const po = await storepoorderds.findById(id);
        if (!po) return res.status(404).json({ success: false, message: "PO not found" });
        res.status(200).json({ success: true, data: po });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching PO", error: error.message });
    }
};

exports.approveStorePO = async (req, res) => {
    try {
        const { poid, status, user } = req.body;
        // Logic to approve PO (finding by poid string or _id depending on usage)
        // Assuming _id for update consistency for now
        const updatedPO = await storepoorderds.findByIdAndUpdate(poid, { postatus: status }, { new: true });

        if (!updatedPO) return res.status(404).json({ message: "PO not found" });

        res.status(200).json({ success: true, message: "PO Approved", data: updatedPO });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error approving PO", error: error.message });
    }
};
