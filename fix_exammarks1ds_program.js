const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './config.env' });

const Classenr1 = require('./Models/classenr1');
const ExamMarks1ds = require('./Models/exammarks1ds');

const COLID = 6050;
const DRY_RUN = false; // Set to false to actually update

async function main() {
    try {
        await mongoose.connect(process.env.DATABASE2);
        console.log('✅ Connected to DB');

        // Step 1: Get the NEW program mapping from classenr1 (already updated)
        // This gives us: { programcode, program (new name with prefix) }
        const classenrPrograms = await Classenr1.aggregate([
            { $match: { colid: COLID } },
            {
                $group: {
                    _id: { program: "$program", programcode: "$programcode" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id.program": 1 } }
        ]);

        console.log('\n📋 Current classenr1 program mapping (NEW values):');
        console.log('─'.repeat(80));
        classenrPrograms.forEach((p, i) => {
            console.log(`  ${i + 1}. Program: "${p._id.program}" | Code: "${p._id.programcode}" | Records: ${p.count}`);
        });

        // Step 2: Get current distinct program values from exammarks1ds
        const examPrograms = await ExamMarks1ds.aggregate([
            { $match: { colid: COLID } },
            {
                $group: {
                    _id: { program: "$program", branch: "$branch" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id.program": 1 } }
        ]);

        console.log('\n📋 Current exammarks1ds data (program vs branch):');
        console.log('─'.repeat(80));
        examPrograms.forEach((p, i) => {
            console.log(`  ${i + 1}. Program: "${p._id.program}" | Branch: "${p._id.branch}" | Records: ${p.count}`);
        });

        // Step 3: Build mapping from branch (old name) → new program name from classenr1
        // The branch in exammarks1ds should match the base name in classenr1
        // classenr1 program names have "Diploma & Engineering in " prefix
        const branchToNewProgram = {};
        for (const cp of classenrPrograms) {
            const newName = cp._id.program;
            // Strip the prefix to get the base name for matching
            const prefix = "Diploma & Engineering in ";
            const baseName = newName.startsWith(prefix) ? newName.substring(prefix.length) : newName;
            branchToNewProgram[baseName] = newName;
        }

        console.log('\n📋 Branch → New Program Name mapping:');
        console.log('─'.repeat(80));
        Object.entries(branchToNewProgram).forEach(([branch, newProg], i) => {
            console.log(`  ${i + 1}. "${branch}" → "${newProg}"`);
        });

        // Step 4: Update exammarks1ds - set program = new name from classenr1 based on branch match
        console.log('\n\n🔄 Proposed Updates:');
        console.log('─'.repeat(80));

        let totalUpdated = 0;
        for (const [baseName, newProgramName] of Object.entries(branchToNewProgram)) {
            // Find records where branch matches the base name and program doesn't already have the new name
            const matchCount = await ExamMarks1ds.countDocuments({
                colid: COLID,
                branch: baseName,
                program: { $ne: newProgramName }
            });

            if (matchCount > 0) {
                console.log(`  "${baseName}" → "${newProgramName}" (${matchCount} records)`);

                if (!DRY_RUN) {
                    const result = await ExamMarks1ds.updateMany(
                        { colid: COLID, branch: baseName },
                        { $set: { program: newProgramName } }
                    );
                    console.log(`    ✅ Updated ${result.modifiedCount} records`);
                    totalUpdated += result.modifiedCount;
                }
            }
        }

        // Also check for records where program matches the base name directly (program == branch case)
        // This handles the case from update_exammarks1ds_program.js where program was set to branch
        const unmatchedByBranch = await ExamMarks1ds.aggregate([
            { $match: { colid: COLID } },
            {
                $group: {
                    _id: "$program",
                    branches: { $addToSet: "$branch" },
                    count: { $sum: 1 }
                }
            }
        ]);

        console.log('\n📋 Records with program values not yet mapped:');
        for (const rec of unmatchedByBranch) {
            const currentProgram = rec._id;
            if (branchToNewProgram[currentProgram] && branchToNewProgram[currentProgram] !== currentProgram) {
                console.log(`  Program "${currentProgram}" → "${branchToNewProgram[currentProgram]}" (${rec.count} records)`);
                if (!DRY_RUN) {
                    const result = await ExamMarks1ds.updateMany(
                        { colid: COLID, program: currentProgram },
                        { $set: { program: branchToNewProgram[currentProgram] } }
                    );
                    console.log(`    ✅ Updated ${result.modifiedCount} records`);
                    totalUpdated += result.modifiedCount;
                }
            }
        }

        if (DRY_RUN) {
            console.log('\n⚠️  DRY RUN - No changes made. Set DRY_RUN = false to apply.\n');
        } else {
            console.log(`\n✅ All updates complete! Total records updated: ${totalUpdated}`);
        }

        // Final verification
        if (!DRY_RUN) {
            console.log('\n📊 Final state of exammarks1ds programs:');
            const finalState = await ExamMarks1ds.aggregate([
                { $match: { colid: COLID } },
                { $group: { _id: { program: "$program", branch: "$branch" }, count: { $sum: 1 } } },
                { $sort: { "_id.program": 1 } }
            ]);
            finalState.forEach((p, i) => {
                console.log(`  ${i + 1}. Program: "${p._id.program}" | Branch: "${p._id.branch}" | Records: ${p.count}`);
            });
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 DB connection closed.');
    }
}

main();
