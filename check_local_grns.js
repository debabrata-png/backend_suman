const mongoose = require('mongoose');
const localgrnds2 = require('./Models/localgrnds2');

async function check() {
    await mongoose.connect('mongodb://localhost:27017/ep3');
    const grns = await localgrnds2.find({}).sort({ createdAt: -1 }).limit(5);
    console.log(JSON.stringify(grns, null, 2));
    process.exit();
}
check();
