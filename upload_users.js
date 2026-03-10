const mongoose = require('mongoose');
const xlsx = require('xlsx');
const dotenv = require('dotenv');
const User = require('./Models/user');

// Load env configurations
dotenv.config({ path: './config.env' });
const DB_URL = "mongodb+srv://user3:Hello123456@cluster0.bhzac.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// Function to format Date to MongoDB Date standard (ISO string format)
function formatDobToMongoDB(dobStr) {
    if (!dobStr) return null;
    let date;

    // Check if it's an Excel serial date number
    if (typeof dobStr === 'number' || (Number(dobStr) > 10000 && !isNaN(Number(dobStr)))) {
        // Excel serial date starting from 1900 
        date = new Date((Number(dobStr) - (25567 + 1)) * 86400 * 1000);
    } else {
        // Try standard Date parsing
        date = new Date(dobStr);

        // If it resulted in an Invalid Date, try custom parsing for DD/MM/YYYY
        if (isNaN(date.getTime()) && typeof dobStr === 'string') {
            const parts = dobStr.split(/[-/]/);
            // Handling variations of date formats
            if (parts.length === 3) {
                // assume DD/MM/YYYY if the first element is a day > 12
                if (parseInt(parts[0]) > 12) {
                    date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`); // YYYY-MM-DD
                } else {
                    // Could be DD/MM/YYYY or MM/DD/YYYY, default to JS standard
                    date = new Date(`${parts[2]}-${parts[0]}-${parts[1]}`);
                }
            }
        }
    }

    if (date && !isNaN(date.getTime())) {
        // Convert to ISO string explicitly for standard MongoDB datetime mapping
        return date.toISOString();
    }

    return dobStr.toString();
}

async function uploadUsers() {
    try {
        console.log("Connecting to database:", DB_URL ? "URL found" : "URL not found");
        await mongoose.connect(DB_URL);
        console.log('MongoDB successfully connected.');

        const workbook = xlsx.readFile('CPS_Student.xlsx');
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Using raw: true to preserve numbers as raw integers (important for Excel dates!)
        const usersData = xlsx.utils.sheet_to_json(sheet, { raw: true });

        console.log(`Found ${usersData.length} records in Excel...`);

        let successCount = 0;
        let errors = [];

        for (let i = 0; i < usersData.length; i++) {
            const rawRow = usersData[i];
            const row = {};

            // Trim header keys to avoid spacing issues (e.g. "address.       ")
            for (let key in rawRow) {
                row[key.trim()] = rawRow[key];
            }

            const regno = row.regno;
            if (!regno) {
                console.log(`Row ${i + 2} skipped: No regno found.`);
                continue;
            }

            // 1. Generate email as regno@cps.edu.in
            // Clean up regno (might have slashes, e.g. 2395/2025)
            const cleanRegno = regno.toString().trim();
            const generatedEmail = `${cleanRegno}@cps.edu.in`;

            // 2. Format DOB
            const rawDob = row['DOB(MM/DD/YYYY)'] || row['dob'] || row['DOB'];
            const formattedDob = formatDobToMongoDB(rawDob);

            // 3. Map to schema fields
            const userData = {
                email: row.email || generatedEmail,
                name: row.name,
                phone: row.phone ? row.phone.toString() : 'NA',
                password: row.password || 'password123',
                role: row.role || 'Student',
                regno: row.regno,
                programcode: row.programcode || 'NA',
                admissionyear: "2025-26",
                semester: row.semester || 'NA',
                section: row.section || 'NA',
                department: row.department || 'NA',
                colid: 3052,
                status: row.status !== undefined ? row.status : 1,
                gender: row.gender,
                photo: row.photo,
                category: row.category,
                address: row.address,
                quota: row.quota,
                fathername: row.fathername,
                mothername: row.mothername,
                dob: formattedDob,
                eligibilityname: row.eligibilityname,
                degree: row.degree,
                minorsub: row.minorsub,
                vocationalsub: row.vocationalsub,
                mdcsub: row.mdcsub,
                othersub: row.othersub,
                merit: row.merit,
                obtain: row.obtain,
                bonus: row.bonus,
                weightage: row.weightage,
                ncctype: row.ncctype,
                isdisabled: row.isdisabled,
                scholarship: row.scholarship,
                rollno: row['Roll No'] || row.rollno,
                cbseno: row['CBSE Reg No'],
            };

            // 4. Upsert by email to avoid duplicate documents if script run multiple times
            try {
                await User.updateOne(
                    { email: userData.email },
                    { $set: userData },
                    { upsert: true, runValidators: true }
                );
                successCount++;
            } catch (err) {
                errors.push(`Row ${i + 2} (Reg: ${regno}): ${err.message}`);
            }
        }

        console.log(`Successfully processed and uploaded ${successCount} records.`);
        if (errors.length > 0) {
            console.log(`Encountered ${errors.length} errors:`);
            console.log(errors.slice(0, 10).join('\n'));
        }

    } catch (e) {
        console.error("Fatal Error:", e);
    } finally {
        mongoose.connection.close();
    }
}

uploadUsers();
