const mongoose = require('mongoose');
const XLSX = require('xlsx');
const User = require('./Models/user');

// MongoDB Connection URI
const MONGODB_URI = "mongodb+srv://user3:Hello123456@cluster0.bhzac.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// Excel File Path - Update this to the actual file name
const FILE_PATH = './useridpu.xlsx';

// The target colid to be set/checked
const targetColid = 3096;

const connectDB = async () => {
    try {
        await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 10000, // 10 second timeout
        });
        console.log("✅ MongoDB connected successfully");
    } catch (err) {
        console.error("❌ MongoDB connection error:", err);
        process.exit(1);
    }
};

const importUsers = async () => {
    await connectDB();

    try {
        console.log(`Reading Excel file from: ${FILE_PATH}`);
        const workbook = XLSX.readFile(FILE_PATH);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);

        console.log(`Found ${data.length} records to process.`);

        if (data.length === 0) {
            console.log("No data found in Excel file. Exiting.");
            process.exit(0);
        }

        let skipped = 0;
        let updated = 0;
        let created = 0;

        for (let i = 0; i < data.length; i++) {
            const row = data[i];

            // Mapping based on user requirements:
            // name(Name), phone(Mobile Number), wpno(whats app Number), 
            // email(Official Email ID), Institute(Institute), department(Department), colid(colid)

            const name = row['Name'];
            const phone = String(row['Mobile Number'] || '').trim();
            const wpno = String(row['Whats app Number'] || '').trim();
            const email = String(row['Official Email ID'] || '').trim().toLowerCase();
            const institution = row['Institute'];
            const department = row['Department'];
            const rowColid = row['colid'] || targetColid; // Use row colid or the constant

            if (!email) {
                console.warn(`⚠️ Skipping row ${i + 2}: Missing Official Email ID`);
                continue;
            }

            // Check if user exists
            const existingUser = await User.findOne({ email: email });

            if (existingUser) {
                if (existingUser.colid === rowColid) {
                    // Skip if colid matches
                    skipped++;
                    // console.log(`⏭️ Skipping ${email} - already exists with colid ${rowColid}`);
                } else {
                    // Update colid if it differs
                    await User.updateOne({ email: email }, { $set: { colid: rowColid } });
                    updated++;
                    console.log(`🔄 Updated ${email}: colid ${existingUser.colid} ➡️ ${rowColid}`);
                }
            } else {
                // Create new user
                const newUser = new User({
                    name: name || "Unknown",
                    email: email,
                    user: email, // Assuming user field is same as email
                    phone: phone || "0000000000",
                    wpno: wpno,
                    institution: institution,
                    department: department || "NA",
                    colid: rowColid,
                    regno: "NA", // Default regno to email
                    password: "Password@123", // Default password
                    role: "Faculty", // Default role
                    programcode: "NA",
                    admissionyear: "2025-26",
                    semester: "NA",
                    section: "NA",
                    status: 1,
                    status1: "Active"
                });

                await newUser.save();
                created++;
                console.log(`✨ Created new user: ${email}`);
            }
        }

        console.log("\n📊 --- Import Summary ---");
        console.log(`Total Records: ${data.length}`);
        console.log(`Created: ${created}`);
        console.log(`Updated (colid only): ${updated}`);
        console.log(`Skipped (already exists): ${skipped}`);
        console.log("---------------------------\n");
        console.log("✅ User Import Process Completed.");

    } catch (error) {
        console.error("❌ An error occurred during the import process:", error);
    } finally {
        mongoose.connection.close();
        process.exit();
    }
};

importUsers();
