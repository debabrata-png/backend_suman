const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './config.env' });
const localgrnds2 = require('./Models/localgrnds2');

async function check() {
    await mongoose.connect(process.env.DATABASE2);
    console.log('Connected.');
    
    // Create a dummy record with all required fields
    const dummy = await localgrnds2.create({
        grnNo: 'DUMMY-' + Date.now(),
        lpoId: 'LPO-DUMMY',
        storeid: '69a947bf173ba06ccd8747c8', // Real store id from dump
        storeName: 'DUMMY_STORE',
        receivedBy: 'DUMMY_USER',
        colid: 30,
        status: 'Pending QC'
    });
    console.log('Created dummy status:', dummy.status);
    
    // Fetch it back to see what's in DB
    const fetched = await localgrnds2.findById(dummy._id);
    console.log('Fetched status:', fetched.status);
    
    // Delete dummy
    await localgrnds2.findByIdAndDelete(dummy._id);
    process.exit();
}
check();
