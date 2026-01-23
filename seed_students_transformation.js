const mongoose = require('mongoose');
const XLSX = require('xlsx');
const User = require('./Models/user');
const fs = require('fs');
const path = require('path');

const MONGODB_URI = "mongodb+srv://user3:Hello123456@cluster0.bhzac.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const FILES = ['./SORT_BETC.xlsx', './SORT_DIPLOMA.xlsx', './SORT_Mtech.xlsx'];
const FAILED_LOG_FILE = './failed_student_uploads.log';
const OUTPUT_CREDENTIALS_FILE = './generated_student_credentials.xlsx';

const connectDB = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("✅ MongoDB connected");
    } catch (err) {
        console.error("❌ MongoDB connection error:", err);
        process.exit(1);
    }
};

// Helper: Parse various date formats
const parseDate = (input) => {
    if (!input) return null;
    if (typeof input === 'number') {
        const utc_days = Math.floor(input - 25569);
        const utc_value = utc_days * 86400;
        return new Date(utc_value * 1000);
    }
    if (typeof input === 'string') {
        const trimmed = input.trim();
        const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4,})$/);
        if (dmyMatch) {
            const day = parseInt(dmyMatch[1], 10);
            const month = parseInt(dmyMatch[2], 10) - 1;
            const yearStr = dmyMatch[3];
            let year = parseInt(yearStr, 10);
            if (yearStr.length > 4 && yearStr.startsWith('20')) {
                year = parseInt(yearStr.substring(0, 4), 10);
            }
            return new Date(year, month, day);
        }
        const standardDate = new Date(trimmed);
        if (!isNaN(standardDate.getTime())) {
            return standardDate;
        }
    }
    return null;
};

const valOrNA = (val) => {
    if (val === undefined || val === null || String(val).trim() === '') {
        return 'NA';
    }
    return String(val).trim();
};

const processFile = async (filePath, logStream, allCredentials) => {
    if (!fs.existsSync(filePath)) {
        console.warn(`⚠️ File not found: ${filePath}`);
        return;
    }

    console.log(`\n--- Processing file: ${filePath} ---`);
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const rawData = XLSX.utils.sheet_to_json(sheet);
    console.log(`Found ${rawData.length} records in Excel`);

    const usersToInsert = [];
    const skippedRecords = [];

    logStream.write(`\n=== Processing File: ${filePath} ===\n`);

    rawData.forEach((row, index) => {
        // GENERATE EMAIL LOGIC
        // Logic: regno@pu.edu.in and if regno dosenot exist the take the first name and add last three digit of the phone no

        const rawRegno = row.regno ? String(row.regno).trim() : '';
        const rawName = row.name ? String(row.name).trim() : '';
        const rawPhone = row.phone ? String(row.phone).trim() : '';

        let generatedEmail = '';

        if (rawRegno && rawRegno.toUpperCase() !== 'NA') {
            generatedEmail = `${rawRegno}@pu.edu.in`;
        } else {
            // Fallback: firstname + last 3 digits of phone
            if (rawName && rawPhone) {
                const firstName = rawName.split(' ')[0];
                const lastThreeDigits = rawPhone.length >= 3 ? rawPhone.slice(-3) : rawPhone;
                generatedEmail = `${firstName}${lastThreeDigits}@pu.edu.in`;
            } else {
                skippedRecords.push({ row: index + 2, reason: "Cannot generate email (Missing Regno AND (Name/Phone))", data: row });
                return;
            }
        }

        // Ensure lowercase
        generatedEmail = generatedEmail.toLowerCase();

        let dob = null;
        const dobDate = parseDate(row.dob);
        if (dobDate && !isNaN(dobDate.getTime())) {
            dob = dobDate.toISOString().split('T')[0];
        } else if (row.dob) {
            dob = String(row.dob);
        } else {
            dob = 'NA';
        }

        let joiningDate = parseDate(row.joiningyear || row["joining year"]);

        const userObj = {
            email: generatedEmail,
            name: valOrNA(row.name),
            phone: valOrNA(row.phone),
            password: row.password ? String(row.password).trim() : 'Password@123',
            role: row.role ? String(row.role).trim() : 'Student',
            regno: valOrNA(row.regno),
            programcode: valOrNA(row.programcode),
            admissionyear: valOrNA(row.admissionyear),
            semester: valOrNA(row.semester),
            section: valOrNA(row.section),
            gender: valOrNA(row.gender),
            department: valOrNA(row.department),
            colid: row.colid ? Number(row.colid) : 3098,
            user: row.user ? String(row.user).trim() : 'adminsopr@pu.edu.in',
            status: 1,
            category: valOrNA(row.category),
            address: valOrNA(row.address),
            fathername: valOrNA(row.fathername),
            mothername: valOrNA(row.mothername),
            dob: dob,
            eligibilityname: valOrNA(row.eligibilityname),
            degree: valOrNA(row.degree),
            obtain: row.obtain,
            isdisabled: valOrNA(row.isdisabled),
            adhaarno: valOrNA(row.adhaar || row.adhaarno),
            abcid: valOrNA(row.abcid),
            wpno: valOrNA(row.wpno),
            joiningdate: joiningDate,
            lastlogin: new Date('2027-06-01T10:00:00Z'),

            // Extras
            photo: valOrNA(row.photo),
            quota: valOrNA(row.quota),
            minorsub: valOrNA(row.minorsub),
            vocationalsub: valOrNA(row.vocationalsub),
            mdcsub: valOrNA(row.mdcsub),
            othersub: valOrNA(row.othersub),
            merit: valOrNA(row.merit),
            ncctype: valOrNA(row.ncctype),
            scholarship: valOrNA(row.scholarship)
        };

        usersToInsert.push(userObj);
    });

    console.log(`Prepared ${usersToInsert.length} users for insertion. Skipped ${skippedRecords.length}.`);

    if (skippedRecords.length > 0) {
        logStream.write(`SKIPPED RECORDS:\n`);
        skippedRecords.forEach(skip => {
            logStream.write(`  Row ${skip.row}: Name=${skip.data.name || 'N/A'} - Reason: ${skip.reason}\n`);
        });
        logStream.write('\n');
    }

    if (usersToInsert.length > 0) {
        try {
            const result = await User.insertMany(usersToInsert, { ordered: false });
            console.log(`✅ Successfully inserted ${result.length} users.`);

            // Add ALL attempted inserts to credentials export list (or only successes? usually logic implies 'this is what we tried to create')
            // But if it failed due to duplicate, we shouldn't perhaps verify it. 
            // However, identifying which ones succeeded in a bulk write with ordered:false is complex without checking _ids.
            // For now, let's assume we export what we generated, or maybe only what didn't throw?
            // User requirement: "create a excel file with the inserted data" -> implies successful ones.
            // But insertMany result only contains docs if all successful or partial.
            // If partial, we don't easily know WHICH specific ones succeeded without iterating errors.

            // Strategy: We will add ALL to the export list. If it failed, it means it already exists or was invalid. 
            // But usually user wants the "New" credentials. 
            // Better: Filter out failed ones from export if possible.

            // In unordered insert, result.insertedIds maps index to ID. But checking that against original array is safe.
            // But errors array gives us indices of FAILURES.

            const failedIndices = new Set();
            // result is the successful docs? No, insertMany returns successful docs.
            // Wait, standard driver returns success count? Mongoose returns the docs.
            // If ordered: false, it throws an error with 'insertedDocs' (successful) and 'writeErrors'.

            // So if no error, all succeeded.
            usersToInsert.forEach(u => {
                allCredentials.push({
                    Name: u.name,
                    Email: u.email, // This is the Generated Email
                    Password: u.password,
                    Phone: u.phone
                });
            });

        } catch (err) {
            if (err.writeErrors) {
                console.warn(`⚠️  Inserted ${err.insertedDocs ? err.insertedDocs.length : 0} users.`);
                console.warn(`⚠️  ${err.writeErrors.length} records FAILED.`);

                // Track failed indices to exclude from export? Or just export valid ones?
                // err.insertedDocs contains the actual docs that GOT inserted.
                if (err.insertedDocs) {
                    err.insertedDocs.forEach(doc => {
                        allCredentials.push({
                            Name: doc.name,
                            Email: doc.email,
                            Password: doc.password,
                            Phone: doc.phone
                        });
                    });
                }

                logStream.write(`Database Insertion Failures:\n`);
                err.writeErrors.forEach(error => {
                    const idx = error.index;
                    const originalData = usersToInsert[idx];
                    const reason = error.errmsg;

                    logStream.write(`  Email: ${originalData ? originalData.email : 'N/A'} - Error: ${reason}\n`);
                });
            } else {
                console.error("Critical creation error:", err);
                logStream.write(`CRITICIAL ERROR: ${err.message}\n`);
            }
        }
    }
};

const exportCredentials = (credentials) => {
    if (credentials.length === 0) {
        console.log("No credentials to export.");
        return;
    }
    const newWb = XLSX.utils.book_new();
    const newWs = XLSX.utils.json_to_sheet(credentials);
    XLSX.utils.book_append_sheet(newWb, newWs, "Credentials");
    XLSX.writeFile(newWb, OUTPUT_CREDENTIALS_FILE);
    console.log(`\nGenerated credentials exported to: ${OUTPUT_CREDENTIALS_FILE} (${credentials.length} records)`);
};

const importData = async () => {
    await connectDB();

    const logStream = fs.createWriteStream(FAILED_LOG_FILE, { flags: 'w' });
    logStream.write(`Batch Upload Log - Timestamp: ${new Date().toISOString()}\n`);

    const allCredentials = [];

    try {
        for (const file of FILES) {
            await processFile(file, logStream, allCredentials);
        }

        exportCredentials(allCredentials);

        console.log(`\nAll done. Detailed logs in ${FAILED_LOG_FILE}`);
    } catch (err) {
        console.error("❌ Global Error:", err);
    } finally {
        logStream.end();
        mongoose.connection.close();
        process.exit();
    }
};

importData();
