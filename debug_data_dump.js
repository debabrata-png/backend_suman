const mongoose = require('mongoose');
const storeitemds = require('./Models/storeitemds');
const requisationds = require('./Models/requisationds');
const itemmasterds = require('./Models/itemmasterds');
const storemasterds = require('./Models/storemasterds');

const run = async () => {
    try {
        await mongoose.connect('mongodb://localhost:27017/campus_technology', { useNewUrlParser: true, useUnifiedTopology: true });
        console.log('Connected to DB');

        const items = await itemmasterds.find({});
        console.log('--- Item Masters (Top 3) ---');
        items.slice(0, 3).forEach(i => console.log(`ID: ${i._id}, Code: ${i.itemcode}, Name: ${i.itemname}`));

        const storeItems = await storeitemds.find({});
        console.log('\n--- Store Items (All) ---');
        storeItems.forEach(i => console.log(`ID: ${i._id}, ItemCode: ${i.itemcode}, ItemName: ${i.itemname}, StoreID: ${i.storeid}, Qty: ${i.quantity}`));

        const requests = await requisationds.find({ reqstatus: 'Pending' });
        console.log('\n--- Pending Requests (All) ---');
        requests.forEach(r => console.log(`ID: ${r._id}, ItemID: ${r.itemid} (in Req), ItemName: ${r.itemname}, StoreID: ${r.storeid}`));

        mongoose.disconnect();
    } catch (e) {
        console.error(e);
    }
};

run();
