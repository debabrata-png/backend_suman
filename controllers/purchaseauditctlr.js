const purchaseauditlog = require('../Models/purchaseauditlog');

exports.getPurchaseAuditLogs = async (req, res) => {
    try {
        const { colid } = req.query;
        if (!colid) {
            return res.status(400).json({ success: false, message: "colid is required" });
        }

        const logs = await purchaseauditlog.find({ colid }).sort({ timestamp: -1 }).limit(1000);

        res.status(200).json({
            success: true,
            count: logs.length,
            data: logs
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching purchase audit logs",
            error: error.message
        });
    }
};
