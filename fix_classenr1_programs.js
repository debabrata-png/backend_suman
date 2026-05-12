const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './config.env' });

const Classenr1 = require('./Models/classenr1');

const COLID = 6050; // Change if needed
const DRY_RUN = false; // Set to false to actually update

async function main() {
    try {
        await mongoose.connect(process.env.DATABASE2);
        console.log('✅ Connected to DB');

        // Step 1: Get distinct program names and their current programcodes
        const programData = await Classenr1.aggregate([
            { $match: { colid: COLID } },
            {
                $group: {
                    _id: "$program",
                    programcodes: { $addToSet: "$programcode" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        console.log('\n📊 Current State - Distinct Programs:\n');
        console.log('─'.repeat(80));
        programData.forEach((p, i) => {
            console.log(`${i + 1}. Program: "${p._id}"`);
            console.log(`   Current code(s): ${JSON.stringify(p.programcodes)}`);
            console.log(`   Records: ${p.count}`);
            console.log('');
        });

        console.log(`\nTotal distinct programs: ${programData.length}`);

        // Step 2: Assign new unique codes and prefix names
        console.log('\n\n📋 Proposed Changes:\n');
        console.log('─'.repeat(80));

        const updates = [];
        programData.forEach((p, i) => {
            const newCode = String(i + 1); // 1, 2, 3...
            const oldName = p._id;
            const prefix = "Diploma & Engineering in ";
            const newName = oldName.startsWith(prefix) ? oldName : prefix + oldName;

            updates.push({
                oldName: oldName,
                newName: newName,
                oldCodes: p.programcodes,
                newCode: newCode,
                count: p.count
            });

            console.log(`${i + 1}. "${oldName}"`);
            console.log(`   → New Name: "${newName}"`);
            console.log(`   → New Code: "${newCode}" (was: ${JSON.stringify(p.programcodes)})`);
            console.log(`   → Records to update: ${p.count}`);
            console.log('');
        });

        if (DRY_RUN) {
            console.log('\n⚠️  DRY RUN - No changes made. Set DRY_RUN = false to apply.\n');
        } else {
            console.log('\n🔄 Applying updates...\n');
            for (const u of updates) {
                const result = await Classenr1.updateMany(
                    { colid: COLID, program: u.oldName },
                    { $set: { program: u.newName, programcode: u.newCode } }
                );
                console.log(`✅ "${u.oldName}" → code "${u.newCode}", name "${u.newName}" (${result.modifiedCount} records updated)`);
            }
            console.log('\n✅ All updates complete!');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 DB connection closed.');
    }
}

main();
