const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: './config.env' });

const User = require('./Models/user');

const DB = process.env.DATABASE2;

if (!DB) {
    console.error('DATABASE2 connection string not found in config.env');
    process.exit(1);
}

const colids = [3098, 3091, 3092, 3094, 4000, 3096, 4004, 4008, 4010, 4012, 4014];
const uniqueColids = [...new Set(colids)];

// Map to convert both Arabic and Roman numerals (odd -> even next, even -> same but Arabic)
const semesterMap = {
    '1': '2',
    'I': '2',
    '2': '2',
    'II': '2',
    '3': '4',
    'III': '4',
    '4': '4',
    'IV': '4',
    '5': '6',
    'V': '6',
    '6': '6',
    'VI': '6',
    '7': '8',
    'VII': '8',
    '8': '8',
    'VIII': '8',
    '9': '10',
    'IX': '10',
    '10': '10',
    'X': '10'
};

const updateSemesters = async () => {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(DB);
        console.log('Connected to database.');

        console.log(`Starting semester update for colids: ${uniqueColids.join(', ')}`);

        let totalUpdated = 0;
        let totalSkipped = 0;
        let stats = {};

        for (const colid of uniqueColids) {
            console.log(`\nProcessing colid: ${colid}...`);

            // Fetch all students in this colid
            const students = await User.find({
                colid,
                role: 'Student'
            });

            console.log(`Found ${students.length} students in colid ${colid}.`);

            let colidUpdated = 0;
            let colidSkipped = 0;

            for (const student of students) {
                if (!student.semester) {
                    colidSkipped++;
                    totalSkipped++;
                    continue;
                }

                const currentSem = student.semester.toString().trim().toUpperCase();
                const targetSem = semesterMap[currentSem];

                if (targetSem && student.semester !== targetSem) {
                    student.semester = targetSem;
                    await student.save();
                    colidUpdated++;
                    totalUpdated++;
                } else {
                    // Semester was already correct (e.g., '2'), or didn't match the map
                    colidSkipped++;
                    totalSkipped++;
                }
            }
            
            stats[colid] = { updated: colidUpdated, skipped: colidSkipped };
            console.log(`Colid ${colid} completed: ${colidUpdated} updated, ${colidSkipped} skipped.`);
        }

        console.log('\n--- UPDATE SUMMARY ---');
        console.log(`Total Students Updated: ${totalUpdated}`);
        console.log(`Total Students Skipped (already correct or unrecognized): ${totalSkipped}`);
        console.log('\nBreakdown by Colid:');
        Object.keys(stats).forEach(colid => {
            const stat = stats[colid];
            console.log(`- ${colid}: ${stat.updated} updated, ${stat.skipped} skipped`);
        });

        console.log('\nDONE.');
        process.exit(0);
    } catch (error) {
        console.error('CRITICAL ERROR:', error);
        process.exit(1);
    }
};

updateSemesters();
