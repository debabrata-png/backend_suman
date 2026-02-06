const mongoose = require('mongoose');
const xlsx = require('xlsx');
const mprograms = require('./Models/mprograms');

// MongoDB Connection String (Taken from seed1.js)
const dbURI = "mongodb+srv://user3:Hello123456@cluster0.bhzac.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const connectDB = async () => {
    try {
        await mongoose.connect(dbURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log("MongoDB connected");
    } catch (err) {
        console.error("MongoDB connection error:", err);
        process.exit(1);
    }
}

const seedMprograms = async () => {
    await connectDB();

    try {
        // Read the Excel file
        const workbook = xlsx.readFile('mprograms.xlsx');
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Convert Sheet to JSON
        const data = xlsx.utils.sheet_to_json(sheet);

        console.log(`Found ${data.length} records in mprograms.xlsx`);

        if (data.length === 0) {
            console.log("No data found in the Excel file.");
            mongoose.connection.close();
            return;
        }

        const result = await mprograms.insertMany(data);
        console.log("Data successfully uploaded!");
        console.log(`${result.length} documents inserted.`);

        mongoose.connection.close();
    } catch (err) {
        if (err.code === 'ENOENT') {
            console.error("Error: mprograms.xlsx file not found in the current directory.");
        } else {
            console.error("Error seeding data:", err);
        }
        mongoose.connection.close(); // Ensure connection closes even on error
    }
}

seedMprograms();