const mongoose = require('mongoose');
const xlsx = require('xlsx');
const dotenv = require('dotenv');
const path = require('path');
const User = require('./Models/user');

// Load environment variables
dotenv.config({ path: './config.env' });

const DB_URL = process.env.DATABASE2;

if (!DB_URL) {
    console.error('Error: DATABASE2 environment variable is not defined in config.env');
    process.exit(1);
}

async function updateRoles() {
    try {
        console.log("Connecting to database at:", DB_URL.split('@')[1] || DB_URL); // Log part of the URL for privacy
        await mongoose.connect(DB_URL);
        console.log('MongoDB successfully connected.');

        const fileName = 'update_role.xlsx';
        const workbook = xlsx.readFile(fileName);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Convert sheet to JSON
        const usersData = xlsx.utils.sheet_to_json(sheet, { raw: true });
        console.log(`Found ${usersData.length} records in Excel...`);

        let successCount = 0;
        let notFoundCount = 0;
        let errorCount = 0;
        let errors = [];

        for (let i = 0; i < usersData.length; i++) {
            const rawRow = usersData[i];
            const row = {};

            // Trim header keys and normalize
            for (let key in rawRow) {
                row[key.trim().toLowerCase()] = rawRow[key];
            }

            const email = row.email ? row.email.toString().trim().toLowerCase() : null;
            const newRole = row.role ? row.role.toString().trim() : null;

            if (!email) {
                console.log(`Row ${i + 2}: Skipped (Empty Email)`);
                notFoundCount++;
                continue;
            }

            if (!newRole) {
                console.log(`Row ${i + 2}: Skipped (Empty Role for ${email})`);
                notFoundCount++;
                continue;
            }

            try {
                // Update the user's role
                const result = await User.updateOne(
                    { email: email },
                    { $set: { role: newRole } },
                    { runValidators: true }
                );

                if (result.matchedCount > 0) {
                    successCount++;
                    if (result.modifiedCount > 0) {
                        console.log(`Row ${i + 2}: UPDATED [${email}] -> [${newRole}]`);
                    } else {
                        console.log(`Row ${i + 2}: NO CHANGE [${email}] (Role already was ${newRole})`);
                    }
                } else {
                    console.warn(`Row ${i + 2}: NOT FOUND [${email}]`);
                    notFoundCount++;
                }
            } catch (err) {
                errorCount++;
                errors.push(`Row ${i + 2} (${email}): ${err.message}`);
                console.error(`Row ${i + 2}: ERROR [${email}] - ${err.message}`);
            }
        }

        console.log("\n" + "=".repeat(50));
        console.log("UPDATE SUMMARY:");
        console.log(`- Total Records Processed: ${usersData.length}`);
        console.log(`- Success/Matched: ${successCount}`);
        console.log(`- Not Found/Skipped: ${notFoundCount}`);
        console.log(`- Errors: ${errorCount}`);
        
        if (errors.length > 0) {
            console.log("\nRecent Errors:");
            console.log(errors.slice(0, 10).join('\n'));
        }
        console.log("=".repeat(50));

    } catch (e) {
        console.error("Fatal Error:", e);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

updateRoles();
