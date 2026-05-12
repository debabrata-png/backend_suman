const mongoose = require('mongoose');
const grnds2 = require('./Models/grnds2');
const localgrnds2 = require('./Models/localgrnds2');

async function check() {
    await mongoose.connect('mongodb://localhost:27017/ep3');
    const std = await grnds2.find({}).sort({ createdAt: -1 }).limit(3).lean();
    const loc = await localgrnds2.find({}).sort({ createdAt: -1 }).limit(3).lean();
    console.log('Standard (grnds2):', JSON.stringify(std, null, 2));
    console.log('Local (localgrnds2):', JSON.stringify(loc, null, 2));
    process.exit();
}
check();
