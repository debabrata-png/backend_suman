
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
const colids = [5050]
const uniqueColids = [...new Set(colids)];

const updateStudents = async () => {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(DB);
        console.log('Connected to database.');

        console.log(`Starting update for colids: ${uniqueColids.join(', ')}`);
        console.log(`Target: Regulation R2025, Academic Year 2026-27, Admission Year 2026-27`);

        // Groups of students to update
        const groupsToUpdate = [
            {
                query: { 
                    programcode: 'BTECH CSE', 
                    semester: '2',
                    $or: [{ academicyear: '2026-27' }, { admissionyear: '2026-27' }]
                },
                targetProgramcode: 'BTECH CSE'
            },
            {
                query: { programcode: 'B.Tech AD', admissionyear: '2025', semester: 'I' },
                targetProgramcode: 'B.TECH AD'
            },
            {
                query: { programcode: 'BTECH AL', admissionyear: '2025', semester: 'I' },
                targetProgramcode: 'BTECH AL'
            },
            {
                query: { programcode: 'B.Tech CE', admissionyear: '2025', semester: 'I' },
                targetProgramcode: 'B.TECH CE'
            },
            {
                query: { programcode: 'BTECH IS', admissionyear: '2025', semester: 'I' },
                targetProgramcode: 'BTECH IS'
            },
            {
                query: { programcode: 'BTECH IT', admissionyear: '2025', semester: 'I' },
                targetProgramcode: 'BTECH IT'
            },
            {
                query: { programcode: 'BTECH ME', admissionyear: '2025', semester: 'I' },
                targetProgramcode: 'B.TECH ME'
            }
        ];

        // Cache for Major subjects by programcode to avoid repeated DB calls
        const subjectCache = {};

        const fetchMajorSubject = async (colid, programcode) => {
            if (!programcode || !colid) return null;
            const cacheKey = `${colid}_${programcode}`;
            if (subjectCache[cacheKey] !== undefined) return subjectCache[cacheKey];

            const majorRecord = await RegulationSubject.findOne({
                colid,
                programcode,
                regulation: 'R2025',
                academicyear: '2025-26',
                type: 'Major'
            });

            subjectCache[cacheKey] = majorRecord ? majorRecord.subject : null;
            return subjectCache[cacheKey];
        };

        let totalUpdated = 0;
        let programStats = {};

        for (const colid of uniqueColids) {
            console.log(`\nProcessing colid: ${colid}...`);

            for (const group of groupsToUpdate) {
                // Build query for this group
                const query = { colid, role: 'Student', ...group.query };

                const students = await User.find(query);
                console.log(`Found ${students.length} students matching query: ${JSON.stringify(group.query)}`);

                for (const student of students) {
                    const majorSubject = await fetchMajorSubject(student.colid, group.targetProgramcode);

                    const updateFields = {
                        academicyear: '2025-26',
                        admissionyear: '2025-26',
                        programcode: group.targetProgramcode,
                        regulation: 'R2025'
                    };

                    // Map Major
                    if (majorSubject) {
                        updateFields.Major = majorSubject;
                    }

                    // Use updateOne to bypass mongoose validation for unrelated fields on legacy data
                    await User.updateOne({ _id: student._id }, { $set: updateFields });
                    totalUpdated++;

                    // Track stats for reporting
                    if (!programStats[group.targetProgramcode]) {
                        programStats[group.targetProgramcode] = { count: 0, hasMajor: !!majorSubject };
                    }
                    programStats[group.targetProgramcode].count++;
                }
            }
        }

        console.log('\n--- UPDATE SUMMARY ---');
        console.log(`Total Students Updated: ${totalUpdated}`);
        console.log('\nBreakdown by Target Program Code:');
        Object.keys(programStats).forEach(code => {
            const stat = programStats[code];
            console.log(`- ${code}: ${stat.count} students (Major: ${stat.hasMajor ? 'YES' : 'NO'})`);
        });

        console.log('\nDONE.');
        process.exit(0);
    } catch (error) {
        console.error('CRITICAL ERROR:', error);
        process.exit(1);
    }
};

updateStudents();
