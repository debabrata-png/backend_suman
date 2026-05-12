const mongoose = require('mongoose');
const ExamMarks1ds = require('./Models/exammarks1ds');
const ExamMarks2ds = require("./Models/exammarks2ds")
const XLSX = require('xlsx');

const MONGODB_URI = "mongodb+srv://user3:Hello123456@cluster0.bhzac.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const updateExamMarksProgram = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("✅ MongoDB connected");

        // const records = await ExamMarks1ds.find({ colid: 6050, branch: { $exists: true, $ne: '' } });
        // console.log(`Found ${records.length} records with a branch.`);

        // let updatedCount = 0;
        // for (const record of records) {
        //     record.program = record.branch;
        //     await record.save();
        //     updatedCount++;
        // }
        // Fetch the current data from MongoDB
        console.log(`📊 Fetching data for college ID 6050...`);
        const records = await ExamMarks2ds.find({ colid: 6050 }).lean();
        console.log(`🔍 Found ${records.length} records.`);

        if (records.length > 0) {
            // Convert any complex objects (like ObjectIds) to strings for cleaner Excel output
            const preparedRecords = records.map(record => {
                const cleaned = { ...record };
                for (let key in cleaned) {
                    if (cleaned[key] && typeof cleaned[key] === 'object' && !Array.isArray(cleaned[key])) {
                        cleaned[key] = cleaned[key].toString();
                    }
                }
                return cleaned;
            });

            // Create and save the Excel workbook
            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.json_to_sheet(preparedRecords);
            XLSX.utils.book_append_sheet(workbook, worksheet, "Exam Marks");

            const fileName = "exam_marks_6050_final.xlsx";
            XLSX.writeFile(workbook, fileName);
            console.log(`✅ Data successfully exported to ${fileName}`);
        } else {
            console.log("⚠️ No records found for colid 6050.");
        }
    } catch (err) {
        console.error("❌ MongoDB operation error:", err);
    } finally {
        mongoose.connection.close();
        process.exit();
    }
};

updateExamMarksProgram();
