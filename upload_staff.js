const mongoose = require('mongoose');
const XLSX = require('xlsx');
const User = require('./Models/user');

const MONGODB_URI = "mongodb+srv://user3:Hello123456@cluster0.bhzac.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const FILE_PATH = './staff_data_pu.xlsx';

const connectDB = async () => {
    try {
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log("✅ MongoDB connected");
    } catch (err) {
        console.error("❌ MongoDB connection error:", err);
        process.exit(1);
    }
};

const importData = async () => {
    await connectDB();

    try {
        console.log(`Reading file from: ${FILE_PATH}`);
        const workbook = XLSX.readFile(FILE_PATH);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Convert to JSON
        const rawData = XLSX.utils.sheet_to_json(sheet);
        console.log(`Found ${rawData.length} records in Excel`);

        if (rawData.length === 0) {
            console.log("No data found in Excel file.");
            process.exit(0);
        }

        const usersToInsert = rawData.map(row => {
            return {
                name: row.name,
                email: row.email,
                phone: row.phone || row.mobile, // Handle potential 'mobile' header
                password: row.password || 'Password@123', // Default if missing
                role: row.role || 'Staff',
                regno: row.regno || row.staff_id || `STAFF${Math.floor(Math.random() * 10000)}`,
                programcode: row.programcode || 'NA',
                admissionyear: row.admissionyear || '2025-26',
                semester: row.semester || 'NA',
                section: row.section || 'NA',
                department: row.department || 'General',
                colid: row.colid || 30, // Default to 30 as per seed_modules, or explicitly from Excel
                user: row.user || 'admin@campus.technology',
                status: 1,
                lastlogin: new Date('2026-12-01T10:00:00Z'), // REQUESTED FIXED DATE
                designation: row.designation,
                // Add validation/defaults for other required fields if necessary
            };
        });

        console.log(`Preparing to insert ${usersToInsert.length} users...`);

        // Optional: Delete existing users with same emails to avoid duplicates?
        // For now, we rely on duplicate key error or just insert.
        // insertMany with ordered: false continues inserting even if some fail

        const result = await User.insertMany(usersToInsert, { ordered: false });
        console.log(`✅ Successfully inserted ${result.length} users.`);

    } catch (error) {
        if (error.writeErrors) {
            console.warn(`⚠️  ${error.writeErrors.length} records failed to insert.`);
            error.writeErrors.forEach(err => {
                const failedDoc = err.getOperation();
                // In bulk write errors, getOperation() returns the document that failed.
                // We use generic property access or try to verify if it exists.
                // Note: The structure of failedDoc depends on driver version but usually matches the insert object.
                const email = failedDoc.email || 'Unknown Email';
                console.error(`❌ Failed to insert record (Index ${err.index}): Email: ${email} - Reason: ${err.errmsg}`);
            });
            console.log(`✅ Successfully inserted (partial batch): ${usersToInsert.length - error.writeErrors.length} users.`);
        } else if (error.code === 11000) {
            // This might happen if not using insertMany or if ordered:true (default is true, but we set false above)
            // But with ordered:false we usually get writeErrors for bulk operations.
            console.warn(`⚠️  Duplicate key error detected: ${error.message}`);
        } else {
            console.error("❌ Critical Error importing data:", error);
        }
    } finally {
        mongoose.connection.close();
        process.exit();
    }
};

importData();
