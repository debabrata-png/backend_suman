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

const colids = [5050];
const uniqueColids = [...new Set(colids)];

const updateSemesters = async () => {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(DB);
        console.log('Connected to database.');

        const targetProgramCodes = [
            'BTECH CSE',
            'B.TECH AD',
            'BTECH AL',
            'B.TECH CE',
            'BTECH IS',
            'BTECH IT',
            'B.TECH ME'
        ];

        let totalUpdated = 0;

        for (const colid of uniqueColids) {
            console.log(`\nProcessing colid: ${colid}...`);

            // Find all students that we just updated
            // They will have academicyear: '2025-26', admissionyear: '2025-26', and one of the updated program codes.
            // We'll filter for those who don't already have semester '2' (or integer 2) just to be safe.
            const query = {
                colid,
                role: 'Student',
                academicyear: '2025-26',
                admissionyear: '2025-26',
                semester: 'I',
                programcode: { $in: targetProgramCodes }
            };

            const students = await User.find(query);
            console.log(`Found ${students.length} total students in this cohort (academic/admission year 2025-26).`);

            let updatedInColid = 0;

            for (const student of students) {
                // If semester is not already '2' (string or number), update it
                if (student.semester !== '2' && student.semester !== 2) {
                    await User.updateOne(
                        { _id: student._id },
                        { $set: { semester: '2' } }
                    );
                    updatedInColid++;
                    totalUpdated++;
                }
            }
            
            console.log(`Updated semester to '2' for ${updatedInColid} students in colid ${colid}.`);
        }

        console.log('\n--- UPDATE SUMMARY ---');
        console.log(`Total Students Updated (Semester changed to 2): ${totalUpdated}`);
        console.log('\nDONE.');
        process.exit(0);
    } catch (error) {
        console.error('CRITICAL ERROR:', error);
        process.exit(1);
    }
};

updateSemesters();
