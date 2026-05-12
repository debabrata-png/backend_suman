const mongoose = require('mongoose');
const XLSX = require('xlsx');
const dotenv = require('dotenv');
const fs = require('fs');
const EmployeeDatabase = require('./Models/employeedatabaseds');

dotenv.config({ path: './config.env' });

// Use DATABASE2 as it matches the app.js connection string
const DB = process.env.DATABASE2 || "mongodb+srv://user3:Hello123456@cluster0.bhzac.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const checkStaffExistence = async () => {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(DB);
        console.log("✅ Connected to MongoDB");

        const filePath = 'Staff Updated Details.xlsx';
        if (!fs.existsSync(filePath)) {
            console.error(`❌ Error: File "${filePath}" not found.`);
            process.exit(1);
        }

        console.log(`Reading Excel file: ${filePath}`);
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);

        console.log(`Found ${data.length} records in Excel.`);

        const missingEmails = [];
        const columnToCheck = 'Official Email ID';
        const staffTypeColumn = 'Staff Type';
        let teachingStaffCount = 0;

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const emailFromExcel = row[columnToCheck];
            const staffType = row[staffTypeColumn];

            // Filter for Teaching Staff only
            if (staffType !== 'Teaching Staff') {
                continue;
            }

            teachingStaffCount++;

            if (!emailFromExcel) {
                console.warn(`Row ${i + 2}: Missing value in "${columnToCheck}" column.`);
                continue;
            }

            const trimmedEmail = emailFromExcel.toString().trim();

            // Check existence in the 'login' field as per request
            const employee = await EmployeeDatabase.findOne({ login: trimmedEmail });

            if (!employee) {
                missingEmails.push({
                    row: i + 2,
                    email: trimmedEmail
                });
            }
        }

        console.log(`\nProcessed ${teachingStaffCount} Teaching Staff records.`);

        console.log("\n--- Check Results ---");
        if (missingEmails.length === 0) {
            console.log("✅ All emails from Excel exist in the database 'login' field.");
        } else {
            console.log(`❌ Found ${missingEmails.length} emails that do NOT exist in the database 'login' field:`);
            missingEmails.forEach(item => {
                console.log(`Row ${item.row}: ${item.email}`);
            });

            // Write to a log file for convenience
            const logFileName = 'missing_staff_log.txt';
            const logContent = missingEmails.map(item => `Row ${item.row}: ${item.email}`).join('\n');
            fs.writeFileSync(logFileName, logContent);
            console.log(`\nLog saved to ${logFileName}`);
        }

    } catch (error) {
        console.error("❌ An error occurred:", error);
    } finally {
        await mongoose.connection.close();
        console.log("Database connection closed.");
    }
};

checkStaffExistence();
