const mongoose = require('mongoose');
const XLSX = require('xlsx');
const User = require('./Models/user');
const Classenr1 = require('./Models/classenr1');
const Mfaccourses = require('./Models/mfaccourses');

// MongoDB Connection URI
const MONGODB_URI = "mongodb+srv://user3:Hello123456@cluster0.bhzac.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// Excel File Path - Update this to the actual file name provided by the user
const FILE_PATH = './pihmoldtonew.xlsx';
const colid = 3098;

const connectDB = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("✅ MongoDB connected successfully");
    } catch (err) {
        console.error("❌ MongoDB connection error:", err);
        process.exit(1);
    }
};

const updateUserIDs = async () => {
    await connectDB();

    try {
        console.log(`Reading Excel file from: ${FILE_PATH}`);
        const workbook = XLSX.readFile(FILE_PATH);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);

        console.log(`Found ${data.length} ID mappings to process.`);

        if (data.length === 0) {
            console.log("No data found in Excel file. Exiting.");
            process.exit(0);
        }

        let totalUpdatedUsers = 0;
        let totalUpdatedClassenr1 = 0;
        let totalUpdatedMfaccourses = 0;

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const oldId = String(row.oldid).trim();
            const newId = String(row.newid).trim();

            if (!oldId || !newId) {
                console.warn(`⚠️ Skipping row ${i + 2}: Missing oldid or newid`);
                continue;
            }

            console.log(`Processing: ${oldId} ➡️ ${newId}`);

            // 1. Update User Table (fields: email and user)
            const existingUser = await User.findOne({ email: newId });
            if (existingUser) {
                // If newid exists, update its colid to the target colid
                const userRes = await User.updateOne(
                    { email: newId },
                    { $set: { colid: colid } }
                );
                totalUpdatedUsers += userRes.modifiedCount || 0;
                console.log(`   - Existing user ${newId} found. Updated colid to ${colid}.`);
            } else {
                // If newid doesn't exist, proceed with renaming oldId to newId
                const userRes = await User.updateMany(
                    { colid: colid, email: oldId },
                    { $set: { email: newId, user: newId } }
                );
                totalUpdatedUsers += userRes.modifiedCount || 0;
            }

            // 2. Update Classenr1 Table (field: user)
            const classRes = await Classenr1.updateMany(
                { colid: colid, user: oldId },
                { $set: { user: newId } }
            );
            totalUpdatedClassenr1 += classRes.modifiedCount || 0;

            // 3. Update Mfaccourses Table (field: user)
            const mfacRes = await Mfaccourses.updateMany(
                { colid: colid, user: oldId },
                { $set: { user: newId } }
            );
            totalUpdatedMfaccourses += mfacRes.modifiedCount || 0;
        }

        console.log("\n📊 --- Update Summary ---");
        console.log(`User Table (email field): ${totalUpdatedUsers} records updated`);
        console.log(`Classenr1 Table (user field): ${totalUpdatedClassenr1} records updated`);
        console.log(`Mfaccourses Table (user field): ${totalUpdatedMfaccourses} records updated`);
        console.log("---------------------------\n");
        console.log("✅ ID Update Process Completed.");

    } catch (error) {
        console.error("❌ An error occurred during the update process:", error);
    } finally {
        mongoose.connection.close();
        process.exit();
    }
};

updateUserIDs();
