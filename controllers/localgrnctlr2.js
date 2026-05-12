const localgrnds2 = require("../Models/localgrnds2");
const gatewaypassds2 = require("../Models/gatewaypassds2");
const storepoorderds2 = require("../Models/storepoorderds2");

exports.addLocalGRN2 = async (req, res) => {
    try {
        const { grnNo, lpoId, storeid, storeName, vendorName, items, receivedBy, colid, gatePassNumber } = req.body;

        if (!grnNo || !lpoId || !storeid || !colid) {
            return res.status(400).json({ success: false, message: "Missing required fields for GRN." });
        }

        const newGRN = await localgrnds2.create({
            grnNo, lpoId, storeid, storeName, vendorName, items, receivedBy, colid, gatePassNumber,
            status: 'Pending QC'
        });

        // Update Gate Pass status if gatePassNumber is provided

        // Update Gate Pass status if gatePassNumber is provided
        if (gatePassNumber) {
            await gatewaypassds2.findOneAndUpdate(
                { passNumber: gatePassNumber, colid },
                { status: 'GRN Created' }
            );
        }

        // Update PO status to Completed
        await storepoorderds2.findOneAndUpdate(
            { poid: lpoId, colid },
            { postatus: 'Completed', actualAmount: items.reduce((sum, i) => sum + (i.netprice || 0), 0) || undefined }
        );

        res.status(201).json({ success: true, data: newGRN });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getLocalGRNs2 = async (req, res) => {
    try {
        const { colid, storeid } = req.query;
        if (!colid) return res.status(400).json({ success: false, message: "colid is required." });

        const query = { colid };
        if (storeid) query.storeid = storeid;

        const grns = await localgrnds2.find(query).sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: grns });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
