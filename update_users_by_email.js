const mongoose = require('mongoose');
const xlsx = require('xlsx');
const User = require('./Models/user');

// Database Connection URL
const DB_URL = "mongodb+srv://erppu_db_user:NIX9cbbnUDGxlOiB@cluster0.eumxu0m.mongodb.net/?appName=Cluster0";

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
            if (parts.length === 3) {
                // assume DD/MM/YYYY if the first element is a day > 12
                if (parseInt(parts[0]) > 12) {
                    date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`); // YYYY-MM-DD
                } else {
                    date = new Date(`${parts[2]}-${parts[0]}-${parts[1]}`);
                }
            }
        }
    }

    if (date && !isNaN(date.getTime())) {
        return date.toISOString();
    }

    return dobStr.toString();
}

function formatAdmissionYear(yearInput) {
    if (!yearInput) return undefined;
    
    let date;
    // Handle Excel number date
    if (typeof yearInput === 'number' && yearInput > 40000) {
        date = new Date((yearInput - (25567 + 1)) * 86400 * 1000);
    } else if (typeof yearInput === 'string') {
        // Check if it's already in YYYY-YY format
        if (/^\d{4}-\d{2}$/.test(yearInput)) return yearInput;
        
        // Try to parse as date if it looks like one (contains - or /)
        if (yearInput.includes('-') || yearInput.includes('/')) {
            const parts = yearInput.split(/[-/]/);
            if (parts.length === 3) {
                // Handle DD-MM-YYYY or MM-DD-YYYY
                const yearPart = parts[2].length === 4 ? parts[2] : parts[0];
                if (yearPart.length === 4) {
                    date = new Date(yearInput.replace(/-/g, '/'));
                    // If parsing failed or year is weird, fall back to string extraction
                    if (isNaN(date.getTime())) {
                        date = { getFullYear: () => parseInt(yearPart) };
                    }
                }
            }
        }
    }

    if (date && (typeof date.getFullYear === 'function')) {
        const fullYear = date.getFullYear();
        if (!isNaN(fullYear)) {
            const nextYearShort = (fullYear + 1).toString().slice(-2);
            return `${fullYear}-${nextYearShort}`;
        }
    }

    return yearInput.toString();
}

async function updateUsers() {
    try {
        console.log("Connecting to database...");
        await mongoose.connect(DB_URL);
        console.log('MongoDB successfully connected.');

        // File name clarified by user
        const fileName = 'SOPR_Student_Data.xlsx';
        const workbook = xlsx.readFile(fileName);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        const usersData = xlsx.utils.sheet_to_json(sheet, { raw: true });
        console.log(`Found ${usersData.length} records in Excel...`);

        let successCount = 0;
        let skipCount = 0;
        let errors = [];

        for (let i = 0; i < usersData.length; i++) {
            const rawRow = usersData[i];
            const row = {};

            // Trim header keys
            for (let key in rawRow) {
                row[key.trim()] = rawRow[key];
            }

            const email = row.email ? row.email.toString().trim().toLowerCase() : null;
            if (!email) {
                console.log(`Row ${i + 2} skipped: No email found.`);
                skipCount++;
                continue;
            }

            // Map to schema fields
            const userData = {
                name: row.name,
                phone: row.phone ? row.phone.toString() : undefined,
                password: row.password,
                role: row.role || 'Student',
                regno: row.regno ? row.regno.toString() : undefined,
                programcode: row.programcode,
                admissionyear: formatAdmissionYear(row.admissionyear),
                semester: row.semester ? row.semester.toString() : undefined,
                section: row.section,
                department: row.department,
                gender: row.gender,
                photo: row.photo,
                category: row.category,
                address: row.address,
                quota: row.quota,
                fathername: row.fathername,
                mothername: row.mothername,
                dob: formatDobToMongoDB(row.dob),
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
                adhaarno: row.adhaar ? row.adhaar.toString() : undefined,
                abcid: row.abcid,
                wpno: row.wpno ? row.wpno.toString() : undefined,
                joiningyear: row.joiningyear
            };

            // Remove undefined fields to avoid overwriting with undefined
            Object.keys(userData).forEach(key => userData[key] === undefined && delete userData[key]);

            try {
                // UPDATE ONLY based on email
                const result = await User.updateOne(
                    { email: email },
                    { $set: userData },
                    { runValidators: true }
                );

                if (result.matchedCount > 0) {
                    successCount++;
                    if (result.modifiedCount > 0) {
                        // console.log(`Row ${i + 2}: Updated ${email}`);
                    } else {
                        // console.log(`Row ${i + 2}: No changes for ${email}`);
                    }
                } else {
                    // console.log(`Row ${i + 2}: Email ${email} not found in database.`);
                    skipCount++;
                }
            } catch (err) {
                errors.push(`Row ${i + 2} (Email: ${email}): ${err.message}`);
            }
        }

        console.log("--------------------------------------------------");
        console.log(`Processing complete.`);
        console.log(`Matched & Updated: ${successCount}`);
        console.log(`Skipped (Not found/No email): ${skipCount}`);
        if (errors.length > 0) {
            console.log(`Encountered ${errors.length} errors:`);
            console.log(errors.slice(0, 5).join('\n'));
        }
        console.log("--------------------------------------------------");

    } catch (e) {
        console.error("Fatal Error:", e);
    } finally {
        mongoose.connection.close();
    }
}

updateUsers();
