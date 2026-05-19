const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: './config.env' });

const User = require('./Models/user');

const DB = process.env.DATABASE2;

if (!DB) {
    console.error('DATABASE2 connection string not found in config.env');
    process.exit(1);
}

// Function to replace multiple spaces with a single space and trim leading/trailing spaces
const cleanString = (str) => {
    if (!str || typeof str !== 'string') return str;
    return str.replace(/\s+/g, ' ').trim();
};

const trimSubjects = async () => {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(DB);
        console.log('Connected to database.');

        console.log('Starting cleanup of Major and minorsub fields for selected colids...');

        let totalUpdated = 0;
        let totalProcessed = 0;

        const colids = [3098, 3091, 3092, 3094, 4000, 3096, 4004, 4008, 4010, 4012, 4014];

        // Use a cursor to efficiently stream through students without loading all into memory
        const cursor = User.find({ role: 'Student', colid: { $in: colids } }).cursor();

        for await (const student of cursor) {
            totalProcessed++;
            let needsUpdate = false;

            if (student.Major) {
                const cleanedMajor = cleanString(student.Major);
                if (student.Major !== cleanedMajor) {
                    student.Major = cleanedMajor;
                    needsUpdate = true;
                }
            }

            if (student.minorsub) {
                const cleanedMinor = cleanString(student.minorsub);
                if (student.minorsub !== cleanedMinor) {
                    student.minorsub = cleanedMinor;
                    needsUpdate = true;
                }
            }

            if (needsUpdate) {
                await student.save();
                totalUpdated++;
            }

            if (totalProcessed % 5000 === 0) {
                console.log(`Processed ${totalProcessed} students... Updated: ${totalUpdated}`);
            }
        }

        console.log('\n--- UPDATE SUMMARY ---');
        console.log(`Total Students Processed: ${totalProcessed}`);
        console.log(`Total Students Updated: ${totalUpdated}`);
        console.log('\nDONE.');
        process.exit(0);
    } catch (error) {
        console.error('CRITICAL ERROR:', error);
        process.exit(1);
    }
};

trimSubjects();
