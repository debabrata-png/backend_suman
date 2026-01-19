const deliverydsds = require('../Models/deliverydsds');
const storepoorderds = require('../Models/storepoorderds');
const storeitemds = require('../Models/storeitemds');
const stockregisterds = require('../Models/stockregisterds');

exports.adddeliverydsds = async (req, res) => {
    try {
        const newDelivery = await deliverydsds.create(req.body);
        res.status(201).json({
            status: 'success',
            data: {
                delivery: newDelivery
            }
        });
    } catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err
        });
    }
};

exports.updatedeliverydsds = async (req, res) => {
    try {
        const delivery = await deliverydsds.findByIdAndUpdate(req.query.id, req.body, {
            new: true,
            runValidators: true
        });
        res.status(200).json({
            status: 'success',
            data: {
                delivery
            }
        });
    } catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err
        });
    }
};

exports.deletedeliverydsds = async (req, res) => {
    try {
        await deliverydsds.findByIdAndDelete(req.query.id);
        res.status(204).json({
            status: 'success',
            data: null
        });
    } catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err
        });
    }
};

exports.getalldeliverydsds = async (req, res) => {
    try {
        const deliveries = await deliverydsds.find();
        res.status(200).json({
            status: 'success',
            results: deliveries.length,
            data: {
                deliveries
            }
        });
    } catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err
        });
    }
};

exports.getdeliverydsdsbyid = async (req, res) => {
    try {
        const delivery = await deliverydsds.findById(req.query.id);
        res.status(200).json({
            status: 'success',
            data: {
                delivery
            }
        });
    } catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err
        });
    }
};

// Workflow: Mark Delivered (Full PO)
exports.markDelivered = async (req, res) => {
    try {
        const { poid_str, po_db_id, receivedby, note, user, colid, name } = req.body;

        // 1. Fetch all items in this PO
        const storepoitemsds = require('../Models/storepoitemsds');
        const poItems = await storepoitemsds.find({ poid: poid_str, colid: colid });

        if (!poItems || poItems.length === 0) {
            return res.status(404).json({ status: 'fail', message: 'No items found for this PO' });
        }

        // 2. Process each item: Update Inventory & Stock Register
        // 2. Process each item: Update Inventory & Stock Register
        const itemmasterds = require('../Models/itemmasterds');
        const storeMaster = require('../Models/storemasterds'); // Moved outside loop for efficiency

        for (const item of poItems) {
            // Need Item Code from Master
            const itemMaster = await itemmasterds.findById(item.itemid);
            if (!itemMaster) {
                console.log(`Item Master not found for ID: ${item.itemid}`);
                continue;
            }

            const itemCode = itemMaster.itemcode;

            // Update/Create Store Inventory
            // Find store item by CODE in this college
            // Note: If multiple stores have this item, which one to update?
            // Without storeid in PO, we assume the one that exists or default?

            const existingStoreItem = await storeitemds.findOne({ itemcode: itemCode, colid: colid });
            let targetStoreId;

            if (existingStoreItem) {
                targetStoreId = existingStoreItem.storeid;
                await storeitemds.findByIdAndUpdate(existingStoreItem._id, { $inc: { quantity: item.quantity } });
            } else {
                // Fetch any store to default to
                const anyStore = await storeMaster.findOne({ colid: colid });
                targetStoreId = anyStore?._id;

                if (targetStoreId) {
                    await storeitemds.create({
                        storeid: targetStoreId,
                        storename: anyStore.storename,
                        itemcode: itemCode,
                        itemname: item.itemname,
                        quantity: item.quantity,
                        type: item.itemtype || 'N/A',
                        user: user,
                        colid: colid,
                        status: 'Available',
                        name: 'Auto Created'
                    });
                }
            }

            if (targetStoreId) {
                await stockregisterds.create({
                    storeid: targetStoreId,
                    store: targetStoreId,
                    item: item.itemname,
                    itemid: itemCode, // Using Code as requested by user ("itemcode is the main thing")
                    itemtype: item.itemtype || 'N/A',
                    quantityadded: item.quantity,
                    quantityreturn: 0,
                    netquantity: item.quantity,
                    user: user,
                    colid: colid,
                    stockdate: new Date(),
                    name: name
                });
            }
        }

        // 3. Update PO Status
        await storepoorderds.findByIdAndUpdate(po_db_id, { postatus: 'Delivered' });

        // 4. Create Delivery Record
        const newDelivery = await deliverydsds.create({
            poid: poid_str,
            deliveredDate: new Date(),
            receivedBy: receivedby,
            note: note,
            colid: colid,
            user: user,
            name: name
        });

        res.status(200).json({
            status: 'success',
            message: 'Delivery Processed Successfully',
            data: newDelivery
        });

    } catch (err) {
        console.error(err);
        res.status(400).json({
            status: 'fail',
            message: err.message
        });
    }
};
