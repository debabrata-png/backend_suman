const mongoose = require('mongoose');
const ItemMaster = require('./Models/itemmasterds2');

// ─── 🔧 CONFIG ────────────────────────────────────────────────────────────────
const MONGODB_URI = 'mongodb+srv://user3:Hello123456@cluster0.bhzac.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0E';
const TARGET_COLID = 3090;
const BATCH_SIZE = 500;
// ─────────────────────────────────────────────────────────────────────────────

async function swapCategoryAndType() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const totalDocs = await ItemMaster.countDocuments({ colid: TARGET_COLID });
        console.log(`📦 Total documents to process: ${totalDocs}`);

        if (totalDocs === 0) {
            console.log('⚠️  No documents found. Exiting.');
            return;
        }

        let skip = 0;
        let totalUpdated = 0;
        let batchNum = 0;
        const totalBatches = Math.ceil(totalDocs / BATCH_SIZE);

        while (skip < totalDocs) {
            batchNum++;
            console.log(`\n🔄 Processing batch ${batchNum}/${totalBatches} (skip: ${skip})...`);

            const docs = await ItemMaster.find({ colid: TARGET_COLID })
                .skip(skip)
                .limit(BATCH_SIZE)
                .lean(); // lean() for faster reads

            if (docs.length === 0) break;

            // Build bulkWrite operations — swap category <-> itemtype
            const bulkOps = docs.map(doc => ({
                updateOne: {
                    filter: { _id: doc._id },
                    update: {
                        $set: {
                            category: doc.itemtype ?? null,
                            itemtype: doc.category ?? null
                        }
                    }
                }
            }));

            const result = await ItemMaster.bulkWrite(bulkOps, { ordered: false });
            totalUpdated += result.modifiedCount;

            console.log(`   ✅ Batch ${batchNum} done — modified: ${result.modifiedCount}`);

            skip += BATCH_SIZE;
        }

        console.log(`\n🎉 All done! Total documents updated: ${totalUpdated}/${totalDocs}`);

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

swapCategoryAndType();
