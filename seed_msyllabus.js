const mongoose = require('mongoose');
const XLSX = require('xlsx');
const Msyllabus = require('./Models/msyllabus');

// Use the same connection string as other seed/upload scripts
const MONGODB_URI = "mongodb+srv://user3:Hello123456@cluster0.bhzac.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const FILE_PATH = './ss.xlsx';

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
            // Mapping logic based on model: name, user, colid, year, course, coursecode, module, description, credits, courselink, type, completed, status1, comments

            const name = getVal(row, 'name');
            const user = getVal(row, 'user');
            const colid = getVal(row, 'colid');
            const year = getVal(row, 'year');
            const courseCode = getVal(row, 'coursecode') || getVal(row, 'code');
            const course = getVal(row, 'course') || getVal(row, 'coursename') || getVal(row, 'title');
            const moduleName = getVal(row, 'module');
            const description = getVal(row, 'description');
            const credits = getVal(row, 'credits');
            const courseLink = getVal(row, 'courselink') || getVal(row, 'link');
            const type = getVal(row, 'type');
            const completed = getVal(row, 'completed');
            const status1 = getVal(row, 'status1') || getVal(row, 'status');
            const comments = getVal(row, 'comments') || getVal(row, 'comment');

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
                course: course ? String(course).trim() : undefined,
                module: moduleName ? String(moduleName).trim() : undefined,
                description: description ? String(description).trim() : undefined,
                credits: credits ? Number(credits) : undefined,
                courselink: courseLink ? String(courseLink).trim() : undefined,
                type: type ? String(type).trim() : undefined,
                completed: completed ? String(completed).trim() : undefined,
                status1: status1 ? String(status1).trim() : undefined,
                comments: comments ? String(comments).trim() : undefined
            };
        }).filter(item => item !== null);

        console.log(`Preparing to insert ${recordsToInsert.length} records...`);

        if (recordsToInsert.length > 0) {
            const result = await Msyllabus.insertMany(recordsToInsert, { ordered: false });
            console.log(`✅ Successfully inserted ${result.length} records into 'msyllabus'.`);
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
