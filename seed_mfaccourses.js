const mongoose = require('mongoose');
const XLSX = require('xlsx');
const Mfaccourses = require('./Models/mfaccourses');

// Use the same connection string as other seed/upload scripts
const MONGODB_URI = "mongodb+srv://user3:Hello123456@cluster0.bhzac.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const FILE_PATH = './SOPR_workload.xlsx';

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
        const sheetName = workbook.SheetNames[0]; // Assume data is in the first sheet
        const sheet = workbook.Sheets[sheetName];

        // Convert to JSON
        const rawData = XLSX.utils.sheet_to_json(sheet);
        console.log(`Found ${rawData.length} records in Excel`);

        if (rawData.length === 0) {
            console.log("No data found in Excel file.");
            process.exit(0);
        }

        // Helper to find key tolerating whitespace/newlines
        const findKey = (row, search) => {
            return Object.keys(row).find(k => k.toLowerCase().replace(/[\s\n\r]+/g, '').includes(search.toLowerCase()));
        };

        const getVal = (row, search) => {
            const key = findKey(row, search);
            return key ? row[key] : undefined;
        };

        const recordsToInsert = rawData.map((row, index) => {
            // Mapping logic based on inspected headers: 'year', 'course code', 'name', 'user', 'colid'

            const name = getVal(row, 'name');
            const user = getVal(row, 'user');
            const colid = getVal(row, 'colid');
            const year = getVal(row, 'year');
            const courseCode = getVal(row, 'coursecode');

            // Validate required fields based on schema
            // Schema requires: name, user, colid
            if (!name || !user || !colid) {
                console.warn(`⚠️  Skipping row ${index + 2}: Missing required fields (name, user, or colid). Row data: ${JSON.stringify(row)}`);
                return null;
            }

            return {
                name: String(name).trim(),
                user: String(user).trim(),
                colid: Number(colid),
                year: year ? String(year).trim() : undefined,
                coursecode: courseCode ? String(courseCode).trim() : undefined,
                coursename: String(name).trim(), // Mapping name to coursename as well, as likely intended
                // Other fields optional in schema or not in excel
                type: undefined,
                status1: undefined,
                comments: undefined
            };
        }).filter(item => item !== null);

        console.log(`Preparing to insert ${recordsToInsert.length} records...`);

        if (recordsToInsert.length > 0) {
            const result = await Mfaccourses.insertMany(recordsToInsert, { ordered: false });
            console.log(`✅ Successfully inserted ${result.length} records into 'mfaccourses'.`);
        } else {
            console.log("No valid records to insert.");
        }

    } catch (error) {
        if (error.writeErrors) {
            console.warn(`⚠️  ${error.writeErrors.length} records failed to insert.`);
            // Log a few errors
            error.writeErrors.slice(0, 5).forEach(err => {
                console.error(`❌ Error (Index ${err.index}): ${err.errmsg}`);
            });
        } else {
            console.error("❌ Error importing data:", error);
        }
    } finally {
        mongoose.connection.close();
        process.exit();
    }
};

importData();
