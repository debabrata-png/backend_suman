
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: './config.env' });

const User = require('./Models/user');
const RegulationSubject = require('./Models/regulationsubjectds');

const DB = process.env.DATABASE2;

if (!DB) {
    console.error('DATABASE2 connection string not found in config.env');
    process.exit(1);
}

//const colids = [3098, 3091, 3092, 3094, 4000, 3096, 4004, 4008, 4010, 4012, 4014];
const colids = [3092]
const uniqueColids = [...new Set(colids)];

const updateStudents = async () => {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(DB);
        console.log('Connected to database.');

        console.log(`Starting update for colids: ${uniqueColids.join(', ')}`);
        console.log(`Target: Regulation R2025, Academic Year 2026-27, Admission Year 2026-27`);

        // Cache for Major/Minor subjects by programcode to avoid repeated DB calls
        const subjectCache = {};

        const fetchSubjects = async (colid, programcode) => {
            if (!programcode || !colid) return { major: null, minor: null };
            const cacheKey = `${colid}_${programcode}`;
            if (subjectCache[cacheKey]) return subjectCache[cacheKey];

            const majorRecord = await RegulationSubject.findOne({
                colid,
                programcode,
                regulation: 'R2025',
                academicyear: '2026-27',
                type: 'Major'
            });

            const minorRecord = await RegulationSubject.findOne({
                colid,
                programcode,
                regulation: 'R2025',
                academicyear: '2026-27',
                type: 'Minor'
            });

            subjectCache[cacheKey] = {
                major: majorRecord ? majorRecord.subject : null,
                minor: minorRecord ? minorRecord.subject : null
            };

            return subjectCache[cacheKey];
        };

        let totalUpdated = 0;
        let totalSkipped = 0;
        let programStats = {};

        for (const colid of uniqueColids) {
            console.log(`\nProcessing colid: ${colid}...`);

            // Fetch all students in this colid
            const students = await User.find({
                colid,
                role: 'Student'
            });

            console.log(`Found ${students.length} students.`);

            for (const student of students) {
                const subjects = await fetchSubjects(student.colid, student.programcode);

                // Update common fields
                student.regulation = 'R2025';
                student.academicyear = '2026-27';
                student.admissionyear = '2026-27';

                // Map Major and Minor
                if (subjects.major) {
                    student.Major = subjects.major;
                }
                if (subjects.minor) {
                    student.minorsub = subjects.minor;
                }

                await student.save();
                totalUpdated++;

                // Track stats for reporting
                if (!programStats[student.programcode]) {
                    programStats[student.programcode] = { count: 0, hasMajor: !!subjects.major, hasMinor: !!subjects.minor };
                }
                programStats[student.programcode].count++;
            }
        }

        console.log('\n--- UPDATE SUMMARY ---');
        console.log(`Total Students Updated: ${totalUpdated}`);
        console.log('\nBreakdown by Program Code:');
        Object.keys(programStats).forEach(code => {
            const stat = programStats[code];
            console.log(`- ${code}: ${stat.count} students (Major: ${stat.hasMajor ? 'YES' : 'NO'}, Minor: ${stat.hasMinor ? 'YES' : 'NO'})`);
        });

        console.log('\nDONE.');
        process.exit(0);
    } catch (error) {
        console.error('CRITICAL ERROR:', error);
        process.exit(1);
    }
};

updateStudents();
