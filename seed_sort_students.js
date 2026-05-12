const mongoose = require('mongoose');
const XLSX = require('xlsx');
const User = require('./Models/user');
const path = require('path');
const fs = require('fs');

const MONGODB_URI = "mongodb+srv://user3:Hello123456@cluster0.bhzac.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const STUDENT_FILES = [
    'SORT_BETC.xlsx',
    'SORT_DIPLOMA.xlsx',
    'SORT_Mtech.xlsx'
];
const WORKLOAD_FILE = 'WORK LOAD SORT.xlsx';

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
        // Try DD-MM-YYYY or DD/MM/YYYY
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

const formatDate = (dateObj) => {
    if (!dateObj || isNaN(dateObj.getTime())) return null;
    return dateObj.toISOString().split('T')[0]; // Return YYYY-MM-DD string as often expected by schema if String type
    // Note: User schema has `dob` as String and `joiningdate` as Date. 
};

const importData = async () => {
    await connectDB();

    try {
        // 1. Build Program -> Colid/User Map from Workload
        const workloadPath = path.join(__dirname, WORKLOAD_FILE);
        const programMap = {}; // programcode -> { colid, user }

        if (fs.existsSync(workloadPath)) {
            console.log(`Reading Workload file: ${WORKLOAD_FILE}`);
            const wb = XLSX.readFile(workloadPath);
            const ws = wb.Sheets[wb.SheetNames[0]];
            const wlData = XLSX.utils.sheet_to_json(ws);

            wlData.forEach(row => {
                if (row.programcode && row.colid) {
                    // We prioritize preserving the first mapping we find, or maybe specific ones
                    if (!programMap[row.programcode]) {
                        programMap[row.programcode] = {
                            colid: row.colid,
                            user: row.user
                        };
                    }
                }
            });
            console.log(`Mapped ${Object.keys(programMap).length} program codes to colids.`);
        } else {
            console.warn(`⚠️ Workload file not found. 'colid' lookup might fail.`);
        }


        // 2. Process Student Files
        for (const file of STUDENT_FILES) {
            const filePath = path.join(__dirname, file);
            if (!fs.existsSync(filePath)) {
                console.warn(`⚠️ Skipping missing file: ${file}`);
                continue;
            }

            console.log(`Processing ${file}...`);
            const wb = XLSX.readFile(filePath);
            const ws = wb.Sheets[wb.SheetNames[0]];
            const records = XLSX.utils.sheet_to_json(ws);

            console.log(`Found ${records.length} records in ${file}`);

            const usersToInsert = [];
            const usersToUpdate = [];

            for (const row of records) {
                // Resolve colid
                let colid = row.colid;
                let userOf = row.user; // 'user' field in schema often refers to the admin/faculty user? or the student user? 
                // In schema: user: String. In PIMR script: 'adminsopr@pu.edu.in'.

                if (!colid && row.programcode && programMap[row.programcode]) {
                    colid = programMap[row.programcode].colid;
                }
                if (!colid) colid = 4000; // Fallback

                // Helper to get string safe
                const str = (val) => (val !== undefined && val !== null) ? String(val).trim() : '';

                // Dates
                const dobDate = parseDate(row.dob);
                const dob = dobDate ? formatDate(dobDate) : str(row.dob);

                const joiningDate = parseDate(row.joiningyear || row["joining year"]); // Handle "joining year" key variation

                const userObj = {
                    email: str(row.email),
                    name: str(row.name),
                    phone: str(row.phone),
                    password: str(row.password) || 'Password@123',
                    role: str(row.role) || 'Student',
                    regno: str(row.regno),
                    programcode: str(row.programcode),
                    admissionyear: str(row.admissionyear),
                    semester: str(row.semester),
                    section: str(row.section),
                    gender: str(row.gender),
                    department: str(row.department),
                    colid: Number(colid),
                    user: str(userOf) || (programMap[row.programcode] ? programMap[row.programcode].user : 'adminsopr@pu.edu.in'),
                    status: 1, // Number in schema
                    category: str(row.category),
                    address: str(row.address),
                    fathername: str(row.fathername),
                    mothername: str(row.mothername),
                    dob: dob,
                    eligibilityname: str(row.eligibilityname),
                    degree: str(row.degree),
                    obtain: row.obtain, // Number?
                    isdisabled: str(row.isdisabled),
                    adhaarno: str(row.adhaar || row.adhaarno),
                    abcid: str(row.abcid),
                    wpno: str(row.wpno),
                    joiningdate: joiningDate,
                    lastlogin: new Date(),
                    // extras
                    photo: str(row.photo),
                    quota: str(row.quota),
                    minorsub: str(row.minorsub),
                    vocationalsub: str(row.vocationalsub),
                    mdcsub: str(row.mdcsub),
                    othersub: str(row.othersub),
                    merit: str(row.merit),
                    bonus: row.bonus,
                    weightage: row.weightage,
                    ncctype: str(row.ncctype),
                    scholarship: str(row.scholarship)
                };

                // Add to list. We use bulkWrite for better upsert performance ideally, but insertMany with ordered:false is okay for seeds if we just want to skip dupes.
                // However, user might want to UPDATE if exists.
                // Let's use bulkWrite with upsert based on 'email' or 'regno'

                usersToInsert.push({
                    updateOne: {
                        filter: { email: userObj.email },
                        update: { $set: userObj },
                        upsert: true
                    }
                });
            }

            if (usersToInsert.length > 0) {
                // Batch execution
                const BATCH_SIZE = 500;
                for (let i = 0; i < usersToInsert.length; i += BATCH_SIZE) {
                    const batch = usersToInsert.slice(i, i + BATCH_SIZE);
                    try {
                        const res = await User.bulkWrite(batch);
                        console.log(`   Processed batch ${i / BATCH_SIZE + 1}: Upserted/Matched ${res.upsertedCount + res.modifiedCount + res.matchedCount}`);
                    } catch (err) {
                        console.error(`   ❌ Error in batch ${i}:`, err.message);
                    }
                }
            }
        }

    } catch (err) {
        console.error("❌ General Error:", err);
    } finally {
        mongoose.connection.close();
        process.exit();
    }
};

importData();
