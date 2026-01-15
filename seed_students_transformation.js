const mongoose = require('mongoose');
const XLSX = require('xlsx');
const User = require('./Models/user');

const MONGODB_URI = "mongodb+srv://user3:Hello123456@cluster0.bhzac.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const FILE_PATH = './Student.xlsx';

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

    // 1. If it's a number, assume Excel Serial Date
    if (typeof input === 'number') {
        // Excel base date Dec 30 1899
        const utc_days = Math.floor(input - 25569);
        const utc_value = utc_days * 86400;
        return new Date(utc_value * 1000);
    }

    // 2. If it's a string
    if (typeof input === 'string') {
        const trimmed = input.trim();

        // Handle "DD/MM/YYYY" or "D/M/YYYY" or "DD-MM-YYYY"
        // Date.parse often assumes MM/DD/YYYY for US locale, so strictly parsing DD/MM/YYYY manually is safer for international inputs if ambiguous
        // Regex for DD/MM/YYYY or DD-MM-YYYY
        const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4,})$/);

        if (dmyMatch) {
            const day = parseInt(dmyMatch[1], 10);
            const month = parseInt(dmyMatch[2], 10) - 1; // JS months are 0-11
            const yearStr = dmyMatch[3];
            let year = parseInt(yearStr, 10);

            // Fix potential typos like 20025 -> 2025 if length > 4
            if (yearStr.length > 4 && yearStr.startsWith('20')) {
                // Heuristic: crop to 4 digits if it looks like a typo
                year = parseInt(yearStr.substring(0, 4), 10);
            }

            return new Date(year, month, day);
        }

        // Try standard Date parse (covers YYYY-MM-DD, ISO, etc.)
        const standardDate = new Date(trimmed);
        if (!isNaN(standardDate.getTime())) {
            return standardDate;
        }
    }

    return null;
};

const importData = async () => {
    await connectDB();

    try {
        console.log(`Reading file from: ${FILE_PATH}`);
        const workbook = XLSX.readFile(FILE_PATH);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Read raw data
        const rawData = XLSX.utils.sheet_to_json(sheet);
        console.log(`Found ${rawData.length} records in Excel`);

        const usersToInsert = [];

        for (const row of rawData) {
            // --- Transform Admission Year ---
            let admissionYear = null;
            const admissionRaw = row.admissionyear;

            // Try to parse as date first to extract year
            const admissionDate = parseDate(admissionRaw);
            if (admissionDate && !isNaN(admissionDate.getTime())) {
                admissionYear = admissionDate.getFullYear().toString();
            } else if (admissionRaw) {
                // If parsing failed (maybe it's just a year string "2023"), use raw string
                const str = String(admissionRaw).trim();
                if (str.match(/^\d{4}$/)) {
                    admissionYear = str;
                } else {
                    // Fallback: take first 4 chars
                    admissionYear = str.substring(0, 4);
                }
            }


            // --- Transform DOB ---
            let dob = null;
            const dobDate = parseDate(row.dob);
            if (dobDate && !isNaN(dobDate.getTime())) {
                dob = dobDate.toISOString().split('T')[0];
            } else if (row.dob) {
                dob = String(row.dob); // Fallback to raw string if parsing fails
            }


            // --- Transform Joining Year (to joiningdate) ---
            let joiningDate = parseDate(row.joiningyear);
            // If invalid date, joiningDate remains null or we can try to debug


            // --- Map to User Schema ---
            const userObj = {
                email: row.email,
                name: row.name,
                phone: String(row.phone),
                password: row.password || 'Password@123',
                role: row.role || 'Student',
                regno: row.regno,
                programcode: row.programcode,
                admissionyear: admissionYear,
                semester: String(row.semester),
                section: row.section,
                gender: row.gender,
                department: row.department,

                // Mapping colid and user
                colid: row.colid ? Number(row.colid) : 3052,
                user: row.user || 'adminsopr@pu.edu.in',

                status: 1,

                // Mapped fields
                category: row.category,
                address: row.address,
                fathername: row.fathername,
                mothername: row.mothername,
                dob: dob,
                eligibilityname: String(row.eligibilityname),
                degree: row.degree,
                obtain: row.obtain,
                isdisabled: row.isdisabled,

                adhaarno: String(row.adhaar || row.adhaarno || ''),
                abcid: String(row.abcid || ''),
                wpno: String(row.wpno || ''),
                joiningdate: joiningDate,

                // Defaults
                lastlogin: new Date(),
            };

            usersToInsert.push(userObj);
        }

        console.log(`Prepared ${usersToInsert.length} users for insertion.`);
        if (usersToInsert.length > 0) {
            console.log("Sample User:", JSON.stringify(usersToInsert[0], null, 2));

            // Using insertMany with ordered: false
            try {
                const result = await User.insertMany(usersToInsert, { ordered: false });
                console.log(`✅ Successfully inserted ${result.length} users.`);
            } catch (err) {
                if (err.writeErrors) {
                    console.warn(`⚠️  Inserted ${err.insertedDocs ? err.insertedDocs.length : 'some'} users, but ${err.writeErrors.length} failed (likely duplicates).`);
                } else {
                    throw err;
                }
            }
        }

    } catch (err) {
        console.error("❌ Error importing data:", err);
    } finally {
        mongoose.connection.close();
        process.exit();
    }
};

importData();
