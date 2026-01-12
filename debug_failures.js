const mongoose = require('mongoose');
const XLSX = require('xlsx');
const User = require('./Models/user');
const fs = require('fs');

const MONGODB_URI = "mongodb+srv://user3:Hello123456@cluster0.bhzac.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const FILE_PATH = './staff_data_pu.xlsx';
const OUTPUT_FILE = './debug_output.txt';

const checkFailures = async () => {
    let logBuffer = '';
    const log = (msg) => {
        console.log(msg);
        logBuffer += msg + '\n';
    };

    try {
        await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        log("✅ MongoDB connected for debugging");

        const workbook = XLSX.readFile(FILE_PATH);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json(sheet);
        log(`Checking ${rawData.length} records from Excel...`);

        // Get protected emails list
        const protectedEmails = ['adminallsopr@pu.edu.in', 'adminsopr@pu.edu.in'];

        let failureCount = 0;
        let missingCount = 0;

        for (const [index, row] of rawData.entries()) {
            const email = row.email;
            if (!email) {
                log(`❌ Row ${index + 2}: Missing email`);
                continue;
            }

            // Check if exists
            const exists = await User.findOne({ email: email });
            if (exists) {
                if (protectedEmails.includes(email)) {
                    log(`ℹ️  Skipped (Protected Admin): ${email}`);
                } else {
                    log(`❌ Failed (Already Exists): ${email} (ID: ${exists._id}, ColID: ${exists.colid})`);
                    failureCount++;
                }
            } else {
                log(`✅ Successfully Inserted (Found in DB now? No, wait, script checks existence): ${email} is MISSING from DB!`);
                missingCount++;
            }
        }

        log(`\nSummary: ${failureCount} Failures (Duplicates), ${missingCount} Missing records found.`);

    } catch (err) {
        log(`ERROR: ${err.message}`);
    } finally {
        fs.writeFileSync(OUTPUT_FILE, logBuffer);
        mongoose.connection.close();
    }
};

checkFailures();
