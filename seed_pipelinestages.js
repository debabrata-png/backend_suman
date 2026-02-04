const mongoose = require('mongoose');
const XLSX = require('xlsx');
const PipelineStageag = require('./Models/PipelineStageag');
const fs = require('fs');
const path = require('path');

const MONGODB_URI = "mongodb+srv://user3:Hello123456@cluster0.bhzac.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const FILE_PATH = './pipeline stages.xlsx';

const connectDB = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("✅ MongoDB connected");
    } catch (err) {
        console.error("❌ MongoDB connection error:", err);
        process.exit(1);
    }
};

const valOrDef = (val, def) => {
    if (val === undefined || val === null || String(val).trim() === '') {
        return def;
    }
    return String(val).trim();
};

const importData = async () => {
    await connectDB();

    if (!fs.existsSync(FILE_PATH)) {
        console.error(`❌ File not found: ${FILE_PATH}`);
        console.log("ℹ️  Please create 'PIPELINE_STAGES.xlsx' with columns: StageName, Description, UserEmail, UserName, ColId");
        process.exit(1);
    }

    console.log(`Processing file: ${FILE_PATH}`);
    const workbook = XLSX.readFile(FILE_PATH);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet);

    console.log(`Found ${rawData.length} records.`);

    const recordsToInsert = [];

    rawData.forEach((row, index) => {

        const stageName = valOrDef(row.stageName);

        if (!stageName) {
            console.warn(`⚠️ Skipping row ${index + 2}: Missing StageName`);
            return;
        }

        const newRecord = {
            stagename: stageName,
            description: valOrDef(row.Description),
            user: valOrDef(row.user),
            name: valOrDef(row.name),
            colid: row.colid,
            isactive: true
        };

        recordsToInsert.push(newRecord);
    });

    if (recordsToInsert.length > 0) {
        try {
            const result = await PipelineStageag.insertMany(recordsToInsert);
            console.log(`✅ Successfully inserted ${result.length} pipeline stages.`);
        } catch (err) {
            console.error("❌ Error inserting data:", err);
        }
    } else {
        console.log("⚠️ No valid records to insert.");
    }

    mongoose.connection.close();
};

importData();
