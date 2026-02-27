const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config({ path: './config.env' });
const DB_URI = process.env.DATABASE2;

// Load all models explicitly for fetching all collections
const modelsPath = path.join(__dirname, 'Models');
const modelFiles = fs.readdirSync(modelsPath).filter(file => file.endsWith('.js'));

console.log('Registering all Models...');
for (const file of modelFiles) {
    try {
        require(path.join(modelsPath, file));
    } catch (err) {
        // Some models might have syntax errors or fail to require, ignore them.
    }
}

const Institution = mongoose.models.institutions || require('./Models/institutions');
const User = mongoose.models.User || mongoose.models.user || require('./Models/user');

const seedData = async () => {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(DB_URI);
        console.log('Connected.');

        const jgColid = 9050;
        const institutionsData = [
            { name: 'JG University', colid: 9050, isUniversity: true },
            { name: 'Institution 1', colid: 9055, isUniversity: false },
            { name: 'Institution 2', colid: 9060, isUniversity: false },
            { name: 'Institution 3', colid: 9065, isUniversity: false },
            { name: 'Institution 4', colid: 9070, isUniversity: false }
        ];

        const allNewColids = institutionsData.map(i => i.colid);

        let credentialsLog = "Admin Credentials for JG University & Institutions:\n\n";

        // 1 & 2. Create Institutions and Users
        for (const inst of institutionsData) {
            console.log(`Processing ${inst.name} (colid: ${inst.colid})...`);

            const adminEmail = `admin@${inst.name.replace(/\s/g, '').toLowerCase()}.com`;
            let institution = await Institution.findOne({ colid: inst.colid });

            if (!institution) {
                institution = new Institution({
                    institutionname: inst.name,
                    institutioncode: `CODE${inst.colid}`,
                    name: inst.name,
                    user: adminEmail,
                    address: 'JG Campus',
                    state: 'Gujarat',
                    district: 'Ahmedabad',
                    type: inst.isUniversity ? 'University' : 'Institution',
                    status: 'Active',
                    comments: 'Seeded via JG script',
                    colid: inst.colid,
                    admincolid: jgColid
                });
                await institution.save();
                console.log(`Created Institution: ${inst.name}`);
            }

            if (!inst.isUniversity) {
                // Admin (1 per institution)
                let admin = await User.findOne({ email: adminEmail });
                const adminPassword = 'Password@123';
                if (!admin) {
                    admin = new User({
                        email: adminEmail,
                        name: `${inst.name} Admin`,
                        phone: `123456${inst.colid}`,
                        password: adminPassword,
                        role: 'Admin',
                        regno: `ADM${inst.colid}`,
                        programcode: 'NA',
                        admissionyear: 'NA',
                        semester: 'NA',
                        section: 'NA',
                        department: 'Administration',
                        colid: inst.colid,
                        status: 1
                    });
                    await admin.save();
                }

                credentialsLog += `Institution: ${inst.name}\n`;
                credentialsLog += `Admin ID/Email: ${adminEmail}\nPassword: ${adminPassword}\nColid: ${inst.colid}\n---\n`;

                // Faculty (20 to 50 random)
                const numFac = Math.floor(Math.random() * (50 - 20 + 1)) + 20;
                for (let i = 1; i <= numFac; i++) {
                    const facultyEmail = `faculty_${i}@${inst.name.replace(/\s/g, '').toLowerCase()}.com`;
                    let faculty = await User.findOne({ email: facultyEmail });
                    if (!faculty) {
                        faculty = new User({
                            email: facultyEmail,
                            name: `${inst.name} Faculty ${i}`,
                            phone: `99${inst.colid}${i.toString().padStart(4, '0')}`,
                            password: 'Password@123',
                            role: 'Faculty',
                            regno: `FAC${inst.colid}-${i}`,
                            programcode: 'CS',
                            admissionyear: '2020',
                            semester: '1',
                            section: 'A',
                            department: 'Computer Science',
                            colid: inst.colid,
                            status: 1
                        });
                        await faculty.save();
                    }
                }
                console.log(`Created ${numFac} faculties for ${inst.name}`);

                // Students (80 to 150 random)
                const numStud = Math.floor(Math.random() * (150 - 80 + 1)) + 80;
                for (let i = 1; i <= numStud; i++) {
                    const studentEmail = `student_${i}@${inst.name.replace(/\s/g, '').toLowerCase()}.com`;
                    let student = await User.findOne({ email: studentEmail });
                    if (!student) {
                        student = new User({
                            email: studentEmail,
                            name: `${inst.name} Student ${i}`,
                            phone: `88${inst.colid}${i.toString().padStart(4, '0')}`,
                            password: 'Password@123',
                            role: 'Student',
                            regno: `STU${inst.colid}-${i}`,
                            programcode: 'CS',
                            admissionyear: '2023',
                            semester: (i % 8) + 1 + '',
                            section: String.fromCharCode(65 + (i % 4)),
                            department: 'Computer Science',
                            colid: inst.colid,
                            status: 1
                        });
                        await student.save();
                    }
                }
                console.log(`Created ${numStud} students for ${inst.name}`);
            }
        }

        fs.writeFileSync('jg_admin_credentials.txt', credentialsLog);
        console.log('Saved admin credentials locally to jg_admin_credentials.txt');

        // 3. Copy Data from Colid 30
        const sourceColid = 30;
        const skipModels = ['user', 'admusers', 'institutions']; // Avoiding cloning users or institutions globally

        for (const modelName in mongoose.models) {
            if (skipModels.includes(modelName.toLowerCase())) continue;

            const Model = mongoose.models[modelName];

            // Checking if model schema contains colid field
            if (!Model.schema.paths.colid) continue;

            try {
                const docsToCopy = await Model.find({ colid: sourceColid }).lean();
                if (docsToCopy.length === 0) continue;

                console.log(`Found ${docsToCopy.length} records in ${modelName} for colid 30. Copying to new colids...`);

                const newDocs = [];
                for (const doc of docsToCopy) {
                    for (const newColid of allNewColids) {
                        const newDoc = { ...doc };
                        delete newDoc._id; // Triggers fresh ObjectID creation
                        delete newDoc.__v; // Drops version key overhead
                        newDoc.colid = newColid;
                        newDocs.push(newDoc);
                    }
                }

                if (newDocs.length > 0) {
                    // Try copying. If uniqueness/validation fails (rare on raw colid bumps), gracefully ignore. 
                    await Model.insertMany(newDocs, { ordered: false }).catch(err => {
                        console.log(`   [Info] Could not insert some duplicate/unique constrained records inside ${modelName}. Proceeding.`);
                    });
                }
            } catch (err) {
                console.log(`   [Error] Copy failed for model ${modelName}: ${err.message}`);
            }
        }

        console.log('\n\nSeeding and DB cloning process has completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('\n\nError during seeding process:', error);
        process.exit(1);
    }
};

seedData();
