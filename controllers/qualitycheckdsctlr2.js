const qualitycheckds2 = require('../Models/qualitycheckds2');
const storepoorderds2 = require('../Models/storepoorderds2');
const grnds2 = require('../Models/grnds2');

exports.addQualityCheck2 = async (req, res) => {
    try {
        const {
            grnNo, poid, colid,
            billNo, billDate, challanNo, challanDate, woPoNo,
            inspectorName, items, invoiceAmount, advanceDeduction,
            paymentDetails, corporateDirectorName, executiveName
        } = req.body;

        // 1. Validate GRN exists and is Pending QC
        const grn = await grnds2.findOne({ grnNo, colid });
        if (!grn) return res.status(404).json({ success: false, message: 'GRN not found' });
        if (grn.status === 'QC Done') {
            return res.status(400).json({ success: false, message: 'Quality Check already completed for this GRN' });
        }

        // 2. Determine status
        let totalRejected = 0, totalAccepted = 0;
        items.forEach(item => {
            totalAccepted += Number(item.acceptedQuantity || 0);
            totalRejected += Number(item.rejectedQuantity || 0);
        });
        let status = 'Accepted';
        if (totalRejected > 0 && totalAccepted > 0) status = 'Partially Rejected';
        if (totalAccepted === 0 && totalRejected > 0) status = 'Fully Rejected';

        const netPayableAmount = Number(invoiceAmount || 0) - Number(advanceDeduction || 0);

        // 3. Create QC Record
        const newCheck = await qualitycheckds2.create({
            inspectionId: `QC-${Date.now()}`,
            colid, poid,
            grnNo, grnDate: grn.grnDate,
            gatePassNumber: grn.gatePassNumber,
            billNo, billDate, challanNo, challanDate, woPoNo,
            partyName: grn.partyName || grn.vendorName,
            inspectorName, items, invoiceAmount,
            advanceDeduction: advanceDeduction || 0,
            paymentDetails, netPayableAmount,
            corporateDirectorName, executiveName,
            status
        });

        // 4. Update GRN status
        const grnStatus = status === 'Accepted' ? 'QC Done' : 'Partially Rejected';
        await grnds2.findByIdAndUpdate(grn._id, { status: grnStatus });

        // 5. Update PO status
        const poOrder = await storepoorderds2.findOne({ poid, colid });
        if (poOrder) {
            poOrder.postatus = status === 'Accepted' ? 'Delivered & Inspected' : 'Disputed Delivery';
            await poOrder.save();
        }

        // 6. Add accepted items to store inventory
        const storepoitemsds2 = require('../Models/storepoitemsds2');
        const storeitemds2 = require('../Models/storeitemds2');
        const stockregisterds2 = require('../Models/stockregisterds2');

        for (const item of items) {
            if (Number(item.acceptedQuantity) > 0) {
                const poItemQuery = { poid, colid, itemname: item.itemname };
                if (item.itemid) poItemQuery.itemid = item.itemid;
                const poItem = await storepoitemsds2.findOne(poItemQuery);

                if (poItem && poItem.storeid) {
                    const itemCode = item.itemid || poItem.itemid;
                    const existing = await storeitemds2.findOne({ itemcode: itemCode, colid, storeid: poItem.storeid });
                    let saved;
                    if (existing) {
                        saved = await storeitemds2.findByIdAndUpdate(existing._id, { $inc: { quantity: Number(item.acceptedQuantity) } }, { new: true });
                    } else {
                        saved = await storeitemds2.create({
                            colid, user: inspectorName || 'System',
                            storeid: poItem.storeid, storename: poItem.storename,
                            itemcode: itemCode, itemname: item.itemname,
                            quantity: Number(item.acceptedQuantity),
                            type: poItem.itemtype || 'Consume',
                            category: poItem.category || 'General',
                            unit: poItem.unit || item.unit || 'Nos',
                            status: 'Available', name: 'QC Delivery'
                        });
                    }
                    await stockregisterds2.create({
                        storeid: poItem.storeid, store: poItem.storename || poItem.storeid,
                        itemid: itemCode, item: item.itemname,
                        quantityadded: Number(item.acceptedQuantity), quantityreturn: 0,
                        netquantity: saved.quantity, user: inspectorName || 'System',
                        colid, stockdate: new Date(), name: 'QC Delivery'
                    });
                }
            }
        }

        res.status(201).json({ success: true, data: newCheck });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getAllQualityChecks2 = async (req, res) => {
    try {
        const checks = await qualitycheckds2.find({ colid: req.query.colid }).sort({ inspectionDate: -1 });
        res.status(200).json({ success: true, data: checks });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getQualityCheckById2 = async (req, res) => {
    try {
        const check = await qualitycheckds2.findById(req.params.id);
        if (!check) return res.status(404).json({ success: false, message: 'Inspection not found' });
        res.status(200).json({ success: true, data: check });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
