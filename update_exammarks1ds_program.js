const mongoose = require('mongoose');
const ExamMarks1ds = require('./Models/exammarks1ds');

const MONGODB_URI = "mongodb+srv://user3:Hello123456@cluster0.bhzac.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const updateExamMarksProgram = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("✅ MongoDB connected");

        const records = await ExamMarks1ds.find({ colid: 6050, branch: { $exists: true, $ne: '' } });
        console.log(`Found ${records.length} records with a branch.`);

        let updatedCount = 0;
        for (const record of records) {
            record.program = record.branch;
            await record.save();
            updatedCount++;
        }

        console.log(`✅ Successfully updated 'program' for ${updatedCount} records.`);
    } catch (err) {
        console.error("❌ MongoDB operation error:", err);
    } finally {
        mongoose.connection.close();
        process.exit();
    }
};

updateExamMarksProgram();
