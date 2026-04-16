const mongoose = require('mongoose');
const crmh1 = require('./Models/crmh1');

async function checkLeads() {
    try {
        const DB_URI = 'mongodb+srv://user3:Hello123456@cluster0.bhzac.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
        await mongoose.connect(DB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to MongoDB');

        const totalLeads = await crmh1.countDocuments({});
        console.log('Total Leads in entire DB:', totalLeads);

        const colids = await crmh1.distinct('colid');
        console.log('Distinct Colids:', colids);

        for (const colid of colids) {
            const count = await crmh1.countDocuments({ colid });
            console.log(`Colid ${colid}: ${count} leads`);
            
            const waitingCount = await crmh1.countDocuments({ 
                colid, 
                attendentstatus: { $in: ['No', null, undefined] } 
            });
            console.log(`  Waiting Queue (No status or No): ${waitingCount}`);
            
            const attendedCount = await crmh1.countDocuments({ 
                colid, 
                attendentstatus: 'Yes' 
            });
            console.log(`  Attended: ${attendedCount}`);
        }

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkLeads();
