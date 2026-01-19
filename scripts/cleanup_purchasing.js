const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../config.env') });

const DB = process.env.DATABASE2;

// Import Models
const storemasterds = require('../Models/storemasterds');
const storeuserds = require('../Models/storeuserds');
const storeitemds = require('../Models/storeitemds');
const itemmasterds = require('../Models/itemmasterds');
const itemtypeds = require('../Models/itemtypeds');
const requisationds = require('../Models/requisationds');
const requisationds1 = require('../Models/requisationds1');
const storerequisationds = require('../Models/storerequisationds');
const storepoorderds = require('../Models/storepoorderds');
const storepoitemsds = require('../Models/storepoitemsds');
const vendoritemds = require('../Models/vendoritemds');
const deliverydsds = require('../Models/deliverydsds');
const stockregisterds = require('../Models/stockregisterds');

const deleteData = async () => {
    try {
        await mongoose.connect(DB);
        console.log('DB Connected');

        const filter = { colid: 30, user: 'demo@campus.technology' };
        console.log('Deleting data with filter:', filter);

        const models = [
            //{ name: 'Store Master', model: storemasterds },
            //{ name: 'Store User', model: storeuserds },
            { name: 'Store Item (Inventory)', model: storeitemds },
            // { name: 'Item Master', model: itemmasterds },
            // { name: 'Item Type', model: itemtypeds },
            { name: 'Requisition (Main)', model: requisationds },
            { name: 'Requisition (Staging)', model: requisationds1 },
            { name: 'Store Requisition (Purchase Request)', model: storerequisationds },
            { name: 'PO Order', model: storepoorderds },
            { name: 'PO Items', model: storepoitemsds },
            // { name: 'Vendor Items', model: vendoritemds },
            { name: 'Delivery', model: deliverydsds },
            { name: 'Stock Register', model: stockregisterds }
        ];

        for (const m of models) {
            const result = await m.model.deleteMany(filter);
            console.log(`Deleted ${result.deletedCount} from ${m.name}`);
        }

        console.log('Cleanup Complete');
        process.exit(0);

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

deleteData();
