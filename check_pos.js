const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './config.env' });

const storepoorderds2 = require('./Models/storepoorderds2');
const storepoorderds = require('./Models/storepoorderds');

async function checkPOs() {
    try {
        await mongoose.connect(process.env.DATABASE2);
        console.log('Connected to MongoDB');

        console.log('--- v2 POs ---');
        const pos2 = await storepoorderds2.find({ colid: 3090 });
        console.log(`Total v2 POs for colid 3090: ${pos2.length}`);
        pos2.forEach(p => {
            console.log({ poid: p.poid, postatus: p.postatus, localOrderType: p.localOrderType, vendor: p.vendor });
        });

        console.log('--- v1 POs ---');
        const pos1 = await storepoorderds.find({ colid: 3090 });
        console.log(`Total v1 POs for colid 3090: ${pos1.length}`);
        pos1.forEach(p => {
            console.log({ poid: p.poid, postatus: p.postatus, vendor: p.vendor });
        });

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkPOs();
