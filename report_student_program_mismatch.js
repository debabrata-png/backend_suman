const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './config.env' });

const User = require('./Models/user');
const Classenr1 = require('./Models/classenr1');

const COLID = 6050;

async function main() {
    try {
        await mongoose.connect(process.env.DATABASE2);
        console.log('✅ Connected to DB\n');

        // ─── 1. Users table: distinct programcode + department combos ───
        const userPrograms = await User.aggregate([
            { $match: { colid: COLID, role: 'Student' } },
            {
                $group: {
                    _id: { programcode: "$programcode", department: "$department" },
                    count: { $sum: 1 },
                    sampleRegnos: { $push: "$regno" }
                }
            },
            { $sort: { "_id.programcode": 1 } }
        ]);

        console.log('═'.repeat(90));
        console.log('  USERS TABLE - Distinct ProgramCode + Department (role=student, colid=' + COLID + ')');
        console.log('═'.repeat(90));
        console.log(`${'#'.padEnd(4)} ${'ProgramCode'.padEnd(20)} ${'Department'.padEnd(50)} Count`);
        console.log('─'.repeat(90));
        userPrograms.forEach((u, i) => {
            const pc = (u._id.programcode || '(empty)').padEnd(20);
            const dept = (u._id.department || '(empty)').padEnd(50);
            console.log(`${String(i + 1).padEnd(4)} ${pc} ${dept} ${u.count}`);
        });
        console.log(`\nTotal distinct combos: ${userPrograms.length}`);
        console.log(`Total students: ${userPrograms.reduce((s, u) => s + u.count, 0)}\n`);

        // ─── 2. Classenr1: distinct programcode + program combos ───
        const classenrPrograms = await Classenr1.aggregate([
            { $match: { colid: COLID } },
            {
                $group: {
                    _id: { programcode: "$programcode", program: "$program" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id.programcode": 1 } }
        ]);

        console.log('═'.repeat(90));
        console.log('  CLASSENR1 TABLE - Distinct ProgramCode + Program (colid=' + COLID + ')');
        console.log('═'.repeat(90));
        console.log(`${'#'.padEnd(4)} ${'ProgramCode'.padEnd(20)} ${'Program'.padEnd(55)} Count`);
        console.log('─'.repeat(90));
        classenrPrograms.forEach((c, i) => {
            const pc = (c._id.programcode || '(empty)').padEnd(20);
            const prog = (c._id.program || '(empty)').padEnd(55);
            console.log(`${String(i + 1).padEnd(4)} ${pc} ${prog} ${c.count}`);
        });
        console.log(`\nTotal distinct combos: ${classenrPrograms.length}`);
        console.log(`Total records: ${classenrPrograms.reduce((s, c) => s + c.count, 0)}\n`);

        // ─── 3. Mismatch Analysis ───
        const classenrCodeSet = new Set(classenrPrograms.map(c => c._id.programcode));
        const userCodeSet = new Set(userPrograms.map(u => u._id.programcode));

        const inUsersNotInClassenr = userPrograms.filter(u => !classenrCodeSet.has(u._id.programcode));
        const inClassenrNotInUsers = classenrPrograms.filter(c => !userCodeSet.has(c._id.programcode));

        console.log('═'.repeat(90));
        console.log('  MISMATCH REPORT');
        console.log('═'.repeat(90));

        console.log('\n⚠️  ProgramCodes in USERS but NOT in CLASSENR1:');
        console.log('─'.repeat(90));
        if (inUsersNotInClassenr.length === 0) {
            console.log('  (none)');
        } else {
            inUsersNotInClassenr.forEach((u, i) => {
                console.log(`  ${i + 1}. Code: "${u._id.programcode}" | Dept: "${u._id.department}" | Students: ${u.count}`);
            });
        }

        console.log('\n⚠️  ProgramCodes in CLASSENR1 but NOT in USERS:');
        console.log('─'.repeat(90));
        if (inClassenrNotInUsers.length === 0) {
            console.log('  (none)');
        } else {
            inClassenrNotInUsers.forEach((c, i) => {
                console.log(`  ${i + 1}. Code: "${c._id.programcode}" | Program: "${c._id.program}" | Records: ${c.count}`);
            });
        }

        // ─── 4. Side-by-side comparison by programcode ───
        console.log('\n');
        console.log('═'.repeat(90));
        console.log('  SIDE-BY-SIDE COMPARISON (by ProgramCode)');
        console.log('═'.repeat(90));
        
        const allCodes = [...new Set([...userCodeSet, ...classenrCodeSet])].sort();
        console.log(`${'Code'.padEnd(10)} ${'Users Dept'.padEnd(40)} ${'Classenr1 Program'.padEnd(50)} Match?`);
        console.log('─'.repeat(110));
        
        for (const code of allCodes) {
            const userMatch = userPrograms.find(u => u._id.programcode === code);
            const classenrMatch = classenrPrograms.find(c => c._id.programcode === code);
            const userDept = userMatch ? userMatch._id.department : '(missing)';
            const classenrProg = classenrMatch ? classenrMatch._id.program : '(missing)';
            const match = (userMatch && classenrMatch) ? '✅' : '❌';
            console.log(`${(code || '(empty)').padEnd(10)} ${userDept.padEnd(40)} ${classenrProg.padEnd(50)} ${match}`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 DB connection closed.');
    }
}

main();
