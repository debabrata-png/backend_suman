const pimprestds = require("../Models/pimprestds");

exports.addpimprestds = async (req, res) => {
    try {
        // Ensure required fields are present if not sent by frontend
        if (!req.body.name) req.body.name = req.body.imprestcode;
        if (!req.body.user && req.body.officername) req.body.user = req.body.officername;

        // Custom Reference Number Logic
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth() + 1; // 0-indexed

        // Calculate Financial Year
        let fy;
        if (month >= 4) {
            fy = `${year}-${year + 1}`;
        } else {
            fy = `${year - 1}-${year}`;
        }

        // Format Date Part: DDMM
        const dayStr = String(today.getDate()).padStart(2, '0');
        const monthStr = String(month).padStart(2, '0');
        const datePart = `${dayStr}${monthStr}`;

        // Construct Prefix
        const prefix = `PU/PUR/${fy}/IMPREST/${datePart}/`;

        // Find existing records with this prefix
        // We need to find the one with the highest sequence number
        // Check for exact prefix match using regex to ensure we only get the relevant ones
        // The imprestcode is expected to be `PU/PUR/${fy}/IMPREST/${datePart}/XXX`
        const regex = new RegExp(`^${prefix}\\d{3}$`);

        const lastImprest = await pimprestds.findOne({ imprestcode: regex })
            .sort({ imprestcode: -1 }) // Sort descending to get the last one
            .exec();

        let newSequence = "001";
        if (lastImprest && lastImprest.imprestcode) {
            const parts = lastImprest.imprestcode.split('/');
            const lastSeq = parts[parts.length - 1]; // Get the last part (XXX)
            const lastSeqNum = parseInt(lastSeq, 10);
            if (!isNaN(lastSeqNum)) {
                newSequence = String(lastSeqNum + 1).padStart(3, '0');
            }
        }

        const newImprestCode = `${prefix}${newSequence}`;
        req.body.imprestcode = newImprestCode;

        const newImprest = await pimprestds.create(req.body);
        res.status(201).json({
            success: true,
            message: "Imprest created successfully",
            data: newImprest
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error creating Imprest",
            error: error.message
        });
    }
};

exports.getallpimprestds = async (req, res) => {
    try {
        const { colid, page, limit } = req.query;
        const query = { colid };

        if (page && limit) {
            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);
            const skip = (pageNum - 1) * limitNum;

            const total = await pimprestds.countDocuments(query);
            const imprests = await pimprestds.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum);

            res.status(200).json({
                success: true,
                count: imprests.length,
                total,
                data: { imprests },
                pagination: {
                    total,
                    page: pageNum,
                    limit: limitNum,
                    pages: Math.ceil(total / limitNum)
                }
            });
        } else {
            const imprests = await pimprestds.find(query).sort({ createdAt: -1 });
            res.status(200).json({
                success: true,
                count: imprests.length,
                data: { imprests }
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching Imprests",
            error: error.message
        });
    }
};

exports.updatepimprestds = async (req, res) => {
    try {
        const { id } = req.query;
        const updatedImprest = await pimprestds.findByIdAndUpdate(id, req.body, { new: true });
        if (!updatedImprest) return res.status(404).json({ success: false, message: "Imprest not found" });
        res.status(200).json({
            success: true,
            message: "Imprest updated",
            data: updatedImprest
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error updating Imprest",
            error: error.message
        });
    }
};

exports.deletepimprestds = async (req, res) => {
    try {
        const { id } = req.query;
        await pimprestds.findByIdAndDelete(id);
        res.status(200).json({ success: true, message: "Imprest deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error deleting Imprest", error: error.message });
    }
};
