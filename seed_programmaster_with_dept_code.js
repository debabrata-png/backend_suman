const mongoose = require('mongoose');
const XLSX = require('xlsx');
const programmasterds = require('./Models/programmasterds');
const fs = require('fs');
const path = require('path');

// Connection string
const MONGODB_URI = "mongodb+srv://user3:Hello123456@cluster0.bhzac.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const PROGRAM_FILE_PATH = './programmasterds.xlsx';
const DEPT_FILE_PATH = './Departmentbmu.xlsx';

// const connectDB = async () => {
//     try {
//         await mongoose.connect(MONGODB_URI);
//         console.log("✅ MongoDB connected");
//     } catch (err) {
//         console.error("❌ MongoDB connection error:", err);
//         process.exit(1);
//     }
// };

const valOrDef = (val, def) => {
    if (val === undefined || val === null || String(val).trim() === '') {
        return def;
    }
    return String(val).trim();
};

const importData = async () => {
    // await connectDB();

    // Check files existence
    if (!fs.existsSync(PROGRAM_FILE_PATH)) {
        console.error(`❌ File not found: ${PROGRAM_FILE_PATH}`);
        process.exit(1);
    }
    if (!fs.existsSync(DEPT_FILE_PATH)) {
        console.error(`❌ File not found: ${DEPT_FILE_PATH}`);
        process.exit(1);
    }

    console.log(`Reading Department file: ${DEPT_FILE_PATH}`);
    const deptWorkbook = XLSX.readFile(DEPT_FILE_PATH);
    const deptSheet = deptWorkbook.Sheets[deptWorkbook.SheetNames[0]];
    const deptData = XLSX.utils.sheet_to_json(deptSheet);

    // Create Department Map: DepartmentName -> DepartmentCode
    const departmentMap = {};
    deptData.forEach(row => {
        const name = valOrDef(row.DepartmentName);
        const code = valOrDef(row.DepartmentCode);
        if (name && code) {
            // Normalizing name to lower case for better matching probability, or exact match?
            // User said "mapping course_name from programmasterds and DepartmentName from Departmentbmu"
            // I will use exact match first, maybe trim.
            departmentMap[name] = code;
        }
    });

    console.log(`Mapped ${Object.keys(departmentMap).length} departments.`);

    console.log(`Reading Program file: ${PROGRAM_FILE_PATH}`);
    const progWorkbook = XLSX.readFile(PROGRAM_FILE_PATH);
    const progSheet = progWorkbook.Sheets[progWorkbook.SheetNames[0]];
    const progData = XLSX.utils.sheet_to_json(progSheet);

    console.log(`Found ${progData.length} program records.`);

    const recordsToInsert = [];

    for (let i = 0; i < progData.length; i++) {
        const row = progData[i];

        const courseName = valOrDef(row.course_name);

        if (!courseName) {
            console.warn(`⚠️ Skipping row ${i + 2}: Missing course_name`);
            continue;
        }

        // Map DepartmentCode
        // User Requirement: "collect DepartmentCode from Departmentbmu on mapping course_name from programmasterds and DepartmentName from Departmentbmu"
        // "valid add the code in course_code in programmasterds.jsx" -> implying the DB model

        const mappedCode = departmentMap[courseName];
        let courseCodeToUse = mappedCode;

        if (!mappedCode) {
            console.warn(`⚠️ No DepartmentCode found for course_name '${courseName}' at row ${i + 2}.`);
            // Fallback: use existing course_code if available, or generate a dummy one
            if (row.course_code) {
                console.log(`   Using provided course_code '${row.course_code}' as fallback.`);
                courseCodeToUse = valOrDef(row.course_code);
            } else {
                const dummyCode = `BMU_${String(i + 1).padStart(3, '0')}`;
                console.warn(`   Using dummy course_code '${dummyCode}'.`);
                courseCodeToUse = dummyCode;
            }
        }

        // Check for duplicates - SKIPPED FOR FILE GENERATION ONLY
        // const existingRecord = await programmasterds.findOne({ course_code: courseCodeToUse });
        // if (existingRecord) {
        //     console.warn(`⚠️ Skipping row ${i + 2}: Course code '${courseCodeToUse}' already exists.`);
        //     continue;
        // }

        const newRecord = {
            colid: row.colid,
            category: valOrDef(row.category),
            course_code: courseCodeToUse, // The Mapped Code
            course_name: courseName,
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

    // Flatten the data for Excel export
    const exportData = recordsToInsert.map(record => ({
        colid: record.colid,
        category: record.category,
        course_code: record.course_code,
        course_name: record.course_name,
        institution: record.institution,
        program_type: record.program_type,
        total_seats: record.total_seats,
        duration: record.duration,
        eligibility: record.eligibility,
        total_fee: record.fee_structure.total_fee,
        application_fee: record.fee_structure.application_fee,
        first_installment: record.fee_structure.first_installment,
        installments: record.fee_structure.installments,
        brochure_url: record.brochure_url,
        syllabus_url: record.syllabus_url,
        placement_highlights: record.placement_highlights,
        faculty_info: record.faculty_info,
        accreditation: record.accreditation,
        is_active: record.is_active,
        created_by: record.created_by
    }));

    if (exportData.length > 0) {
        const newBook = XLSX.utils.book_new();
        const newSheet = XLSX.utils.json_to_sheet(exportData);
        XLSX.utils.book_append_sheet(newBook, newSheet, "MappedData");

        const outputFileName = "mapped_programmaster_review.xlsx";
        XLSX.writeFile(newBook, outputFileName);
        console.log(`✅ Successfully created '${outputFileName}' with ${exportData.length} records for review.`);
    } else {
        console.log("⚠️ No valid records to export.");
    }

    // mongoose.connection.close(); // Not connecting to DB anymore
};

importData();
