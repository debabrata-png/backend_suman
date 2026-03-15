const XLSX = require('xlsx');
const path = require('path');
const categoryag1 = require("./Models/categoryag1");
const ProgramCounselords = require("./Models/ProgramCounselords");
const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        await mongoose.connect("mongodb+srv://user3:Hello123456@cluster0.bhzac.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0", {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log("MongoDB connected");
    } catch (err) {
        console.error("Connection error:", err);
        process.exit(1);
    }
}

const updateCategories = async () => {
    await connectDB();
    try {
        const workbook = XLSX.readFile(path.join(__dirname, 'newcategory.xlsx'));
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);

        // Map Category to newcategory, removing duplicates and ensuring case-insensitivity if needed
        const mapping = {};
        data.forEach(row => {
            if (row.Category && row.newcategory) {
                mapping[row.Category.trim()] = row.newcategory.trim();
            }
        });

        console.log("Starting updates for", Object.keys(mapping).length, "mappings");

        for (const [oldName, newName] of Object.entries(mapping)) {
            if (oldName === newName) continue;

            console.log(`Updating: "${oldName}" -> "${newName}"`);

            // Update categoryag1
            const res1 = await categoryag1.updateMany(
                { colid: 6050, category_name: oldName },
                { $set: { category_name: newName } }
            );
            if (res1.modifiedCount > 0) {
                console.log(`  - categoryag1: Updated ${res1.modifiedCount} documents`);
            }

            // Update ProgramCounselords
            const res2 = await ProgramCounselords.updateMany(
                { category: oldName, colid: 6050 },
                { $set: { category: newName } }
            );
            if (res2.modifiedCount > 0) {
                console.log(`  - ProgramCounselords: Updated ${res2.modifiedCount} documents`);
            }
        }

        console.log("Update completed.");
    } catch (err) {
        console.error("Update error:", err);
    } finally {
        mongoose.connection.close();
    }
}

updateCategories();
