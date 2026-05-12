const mongoose = require('mongoose');
const qualitycheckds2 = require('./Models/qualitycheckds2');
const grnds2 = require('./Models/grnds2');

const dotenv = require('dotenv');
dotenv.config({ path: './config.env' });

// MongoDB Connection
const dbURI = process.env.DATABASE2;
mongoose.connect(dbURI)
  .then(() => console.log('Connected to MongoDB...'))
  .catch(err => console.error('Could not connect to MongoDB:', err));

async function migrate() {
    try {
        const qcs = await qualitycheckds2.find({
            $or: [
                { storeName: { $exists: false } },
                { storeName: "" },
                { storeName: null }
            ]
        });

        console.log(`Found ${qcs.length} records needing migration.`);

        let updatedCount = 0;
        for (const qc of qcs) {
            const grn = await grnds2.findOne({ grnNo: qc.grnNo, colid: qc.colid });
            if (grn && grn.storeName) {
                await qualitycheckds2.findByIdAndUpdate(qc._id, {
                    storeId: grn.storeId,
                    storeName: grn.storeName
                });
                updatedCount++;
            }
        }

        console.log(`Migration complete. Updated ${updatedCount} records.`);
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
