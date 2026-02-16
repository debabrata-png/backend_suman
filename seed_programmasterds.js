const mongoose = require('mongoose');
const XLSX = require('xlsx');
const programmasterds = require('./Models/programmasterds');
const fs = require('fs');
const path = require('path');

// Connection string - using the one found in other seed files
const MONGODB_URI = "mongodb+srv://user3:Hello123456@cluster0.bhzac.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const FILE_PATH = './mapped_programmaster_review.xlsx';

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

    try {
        await programmasterds.collection.dropIndex('course_code_1');
        console.log("✅ 'course_code_1' index dropped.");
    } catch (err) {
        if (err.codeName !== 'IndexNotFound') {
            console.log("ℹ️  'course_code_1' index not found or already dropped or other error:", err.message);
        }
    }

    if (!fs.existsSync(FILE_PATH)) {
        console.error(`❌ File not found: ${FILE_PATH}`);
        console.log("ℹ️  Please create 'programmasterds.xlsx' with columns:");
        console.log("   colid, category, course_code, course_name, institution, program_type,");
        console.log("   total_seats, duration, eligibility, total_fee, application_fee,");
        console.log("   first_installment, installments, brochure_url, syllabus_url,");
        console.log("   placement_highlights, faculty_info, accreditation, created_by");
        process.exit(1);
    }

    console.log(`Processing file: ${FILE_PATH}`);
    const workbook = XLSX.readFile(FILE_PATH);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet);

    console.log(`Found ${rawData.length} records.`);

    const recordsToInsert = [];

    for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i];

        // Required validations
        if (!row.colid || !row.category || !row.course_code || !row.course_name) {
            console.warn(`⚠️ Skipping row ${i + 2}: Missing required fields (colid, category, course_code, or course_name)`);
            continue;
        }

        // Check for duplicates in current batch or DB (optimally should check DB before inserting)
        // SKIPPED: User requested to allow duplicates for course_code
        // const existingRecord = await programmasterds.findOne({ course_code: valOrDef(row.course_code) });
        // if (existingRecord) {
        //     console.warn(`⚠️ Skipping row ${i + 2}: Course code '${row.course_code}' already exists.`);
        //     continue;
        // }

        const newRecord = {
            colid: row.colid,
            category: valOrDef(row.category),
            course_code: valOrDef(row.course_code),
            course_name: valOrDef(row.course_name),
            institution: valOrDef(row.institution),
            program_type: valOrDef(row.program_type),
            total_seats: row.total_seats || 0,
            duration: valOrDef(row.duration),
            eligibility: valOrDef(row.eligibility),
            fee_structure: {
                total_fee: row.total_fee || 0,
                application_fee: row.application_fee || 0,
                first_installment: row.first_installment || 0,
                installments: row.installments || 0
            },
            brochure_url: valOrDef(row.brochure_url),
            syllabus_url: valOrDef(row.syllabus_url),
            placement_highlights: valOrDef(row.placement_highlights),
            faculty_info: valOrDef(row.faculty_info),
            accreditation: valOrDef(row.accreditation),
            is_active: valOrDef(row.is_active, 'Yes'),
            created_by: valOrDef(row.created_by)
        };

        recordsToInsert.push(newRecord);
    }

    if (recordsToInsert.length > 0) {
        try {
            const result = await programmasterds.insertMany(recordsToInsert);
            console.log(`✅ Successfully inserted ${result.length} program records.`);
        } catch (err) {
            console.error("❌ Error inserting data:", err);
        }
    } else {
        console.log("⚠️ No valid records to insert.");
    }

    mongoose.connection.close();
};

importData();
