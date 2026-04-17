const mongoose = require('mongoose');
const xlsx = require('xlsx');
const dotenv = require('dotenv');
const User = require('./Models/user');

// Load environment variables
dotenv.config({ path: './config.env' });

const DB_URL = process.env.DATABASE2;
const EXCEL_FILE_NAME = 'Sequential_Dept_Admin_Users_100100.xlsx';

if (!DB_URL) {
    console.error('Error: DATABASE2 environment variable is not defined in config.env');
    process.exit(1);
}

async function uploadUsers() {
    try {
        console.log(`Connecting to database...`);
        await mongoose.connect(DB_URL);
        console.log('MongoDB successfully connected.');

        // 1. Read the Excel file
        console.log(`Reading ${EXCEL_FILE_NAME}...`);
        const workbook = xlsx.readFile(EXCEL_FILE_NAME);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const usersData = xlsx.utils.sheet_to_json(sheet, { raw: true });

        console.log(`Found ${usersData.length} records in Excel...`);

        // Check if the first row is actually data (if 'email' key is missing)
        let hasHeaders = usersData.length > 0 && Object.keys(usersData[0]).some(k => k.toLowerCase().includes('email'));
        
        if (!hasHeaders && usersData.length > 0) {
            console.warn('Warning: No header row detected. Mapping columns by index...');
        }

        let successCount = 0;
        let errors = [];

        // 2. Fallback logic if no headers: re-read the sheet row by row
        let finalData = [];
        if (!hasHeaders) {
            const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
            finalData = rows.map(r => ({
                email: r[0],
                name: r[1],
                phone: r[2],
                password: r[3],
                role: r[4],
                regno: r[5],
                programcode: r[6],
                admissionyear: r[7],
                semester: r[8],
                section: r[9],
                department: r[10],
                colid: r[11],
                status: r[12],
                institution: r[13]
            }));
        } else {
            // Normalize keys (trim and lowercase)
            finalData = usersData.map(rawRow => {
                const row = {};
                for (let key in rawRow) {
                    row[key.trim().toLowerCase()] = rawRow[key];
                }
                return row;
            });
        }

        console.log(`Ready to process ${finalData.length} records...`);

        // 3. Iterate and upsert
        for (let i = 0; i < finalData.length; i++) {
            const row = finalData[i];
            const email = row.email ? row.email.toString().trim().toLowerCase() : null;

            if (!email || email.toLowerCase() === 'email') {
                console.warn(`Row ${i + 1}: Skipped (Invalid email or header row)`);
                continue;
            }

            // Map Excel fields to User schema
            const userData = {
                email: email,
                name: row.name,
                phone: row.phone || 'NA',
                password: row.password || 'Password@123',
                role: row.role,
                regno: row.regno || email,
                programcode: row.programcode || 'NA',
                admissionyear: row.admissionyear || '2025-26',
                semester: row.semester || 'NA',
                section: row.section || 'NA',
                department: row.department || 'NA',
                colid: row.colid ? parseInt(row.colid) : 100100,
                status: parseInt(row.status) || 1,
                institution: row.institution
            };

            try {
                // Upsert based on email
                const result = await User.updateOne(
                    { email: email },
                    { $set: userData },
                    { upsert: true, runValidators: true }
                );

                if (result.upsertedCount > 0) {
                    console.log(`Row ${i + 1}: CREATED [${email}]`);
                } else if (result.modifiedCount > 0) {
                    console.log(`Row ${i + 1}: UPDATED [${email}]`);
                } else {
                    console.log(`Row ${i + 1}: NO CHANGE [${email}]`);
                }
                successCount++;
            } catch (err) {
                console.error(`Row ${i + 1}: Error [${email}] - ${err.message}`);
                errors.push(`Row ${i + 1} (${email}): ${err.message}`);
            }
        }

        console.log(`\nProcessing Summary:`);
        console.log(`- Total processed: ${successCount}`);
        console.log(`- Total errors: ${errors.length}`);

    } catch (error) {
        console.error('Fatal error during upload:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

uploadUsers();
