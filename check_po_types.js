const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: 'd:/Campus_technology/backend-main/config.env' });

const storepoorderSchema = new mongoose.Schema({}, { strict: false });
const storepoorderds2 = mongoose.model('storepoorderds2', storepoorderSchema);

async function check() {
    await mongoose.connect(process.env.DATABASE2 || process.env.DATABASE);
    console.log('Connected to DB');
    
    // Find recent POs
    const pos = await storepoorderds2.find({}).sort({ createdAt: -1 }).limit(20);
    
    pos.forEach(p => {
        console.log(`ID: ${p.poid}, Status: ${p.postatus}, LocalOrderType: ${p.localOrderType}, Vendor: ${p.vendorname || p.vendor}`);
    });
    
    mongoose.connection.close();
}

check();
