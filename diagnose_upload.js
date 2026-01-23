const mongoose = require('mongoose');
const XLSX = require('xlsx');
const User = require('./Models/user');

const MONGODB_URI = "mongodb+srv://user3:Hello123456@cluster0.bhzac.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const FILE_PATH = './PIMR_Student.xlsx';

const connectDB = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("✅ MongoDB connected");
    } catch (err) {
        console.error("❌ MongoDB connection error:", err);
        process.exit(1);
    }
};

// Helper: Parse various date formats (same as original)
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

const diagnose = async () => {
    await connectDB();

    try {
        const count = await User.countDocuments();
        console.log(`Current User count in DB: ${count}`);

        console.log(`Reading file from: ${FILE_PATH}`);
        const workbook = XLSX.readFile(FILE_PATH);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(sheet);
        console.log(`Found ${rawData.length} records in Excel`);

        if (rawData.length === 0) {
            console.log("No data in Excel file!");
            return;
        }

        const row = rawData[0];
        let dob = null;
        const dobDate = parseDate(row.dob);
        if (dobDate && !isNaN(dobDate.getTime())) {
            dob = dobDate.toISOString().split('T')[0];
        } else if (row.dob) {
            dob = String(row.dob);
        }

        let joiningDate = parseDate(row.joiningyear);

        const userObj = {
            email: row.email,
            name: row.name,
            phone: String(row.phone),
            password: row.password || 'Password@123',
            role: row.role || 'Student',
            regno: row.regno,
            programcode: row.programcode,
            admissionyear: row.admissionyear,
            semester: String(row.semester),
            section: row.section,
            gender: row.gender,
            department: row.department,
            colid: row.colid ? Number(row.colid) : 4000,
            user: row.user || 'adminsopr@pu.edu.in',
            status: 1,
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
            lastlogin: new Date('2027-06-01T10:00:00Z'),
        };

        console.log("Attempting to insert FIRST user:", userObj);

        try {
            await User.create(userObj);
            console.log("✅ Successfully inserted test user.");
        } catch (err) {
            console.error("❌ Failed to insert test user.");
            if (err.name === 'ValidationError') {
                console.error("Validation Errors:", JSON.stringify(err.errors, null, 2));
            } else if (err.code === 11000) {
                console.error("Duplicate Key Error:", JSON.stringify(err.keyValue, null, 2));
            } else {
                console.error("Error:", err);
            }
        }

    } catch (err) {
        console.error("General Error:", err);
    } finally {
        mongoose.connection.close();
        process.exit();
    }
};

diagnose();
