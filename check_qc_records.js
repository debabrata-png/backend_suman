const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: 'd:/Campus_technology/backend-main/config.env' });

const qcSchema = new mongoose.Schema({}, { strict: false });
const qualitycheckds2 = mongoose.model('qualitycheckds2', qcSchema);

async function check() {
    await mongoose.connect(process.env.DATABASE2 || process.env.DATABASE);
    process.env.DATABASE2 || process.env.DATABASE;
    console.log('Connected to DB');
    
    // Find recent QC records
    const qcs = await qualitycheckds2.find({}).sort({ createdAt: -1 }).limit(10);
    
    qcs.forEach(q => {
        console.log(`QC ID: ${q.inspectionId}, GRN: ${q.grnNo}, ReturnType: ${q.returnType}`);
        (q.items || []).forEach(item => {
            console.log(`  - Item: ${item.itemname}, Accepted: ${item.acceptedQuantity}, Rejected: ${item.rejectedQuantity}`);
        });
    });
    
    mongoose.connection.close();
}

check();
