const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './config.env' });

const grnds2 = require('./Models/grnds2');
const localgrnds2 = require('./Models/localgrnds2');

async function check() {
    const DB = process.env.DATABASE2;
    console.log('Connecting to:', DB);
    await mongoose.connect(DB);
    console.log('Connected.');
    
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));

    const stdCount = await grnds2.countDocuments({});
    const locCount = await localgrnds2.countDocuments({});
    
    console.log('Total grnds2:', stdCount);
    console.log('Total localgrnds2:', locCount);
    
    const std = await grnds2.find({}).sort({ createdAt: -1 }).limit(10).lean();
    const loc = await localgrnds2.find({}).sort({ createdAt: -1 }).limit(10).lean();
    
    console.log('--- Standard ---');
    console.log(JSON.stringify(std, null, 2));
    console.log('--- Local ---');
    console.log(JSON.stringify(loc, null, 2));
    
    process.exit();
}
check();
