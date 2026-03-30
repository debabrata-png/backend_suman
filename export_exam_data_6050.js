const mongoose = require('mongoose');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: './config.env' });

// Load models
const classenr1 = require('./Models/classenr1');
const examadmit = require('./Models/examadmit');
const exammarks1ds = require('./Models/exammarks1ds');

const DB_URL = process.env.DATABASE2 || "mongodb+srv://user3:Hello123456@cluster0.bhzac.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const COLID_TARGET = 6050;
const OUTPUT_FILE = 'exam_data_6050.xlsx';

async function exportData() {
    try {
        console.log(`[EXPORT]: Connecting to database...`);
        await mongoose.connect(DB_URL);
        console.log('[EXPORT]: Connected to MongoDB');

        console.log(`[EXPORT]: Fetching data for colid: ${COLID_TARGET}...`);

        // Fetch concurrently
        const [classenrData, examadmitData, exammarksData] = await Promise.all([
            classenr1.find({ colid: COLID_TARGET }).lean(),
            examadmit.find({ colid: COLID_TARGET }).lean(),
            exammarks1ds.find({ colid: COLID_TARGET }).lean()
        ]);

        console.log(`[EXPORT]: Results found:`);
        console.log(`  - classenr1: ${classenrData.length}`);
        console.log(`  - examadmit: ${examadmitData.length}`);
        console.log(`  - exammarks1ds: ${exammarksData.length}`);

        // Create workbook
        const workbook = xlsx.utils.book_new();

        // Helper: convert _id to string for better display in Excel
        const prepare = (data) => data.map(item => ({
            ...item,
            _id: item._id.toString()
        }));

        // Add sheets
        if (classenrData.length > 0) {
            const sheet = xlsx.utils.json_to_sheet(prepare(classenrData));
            xlsx.utils.book_append_sheet(workbook, sheet, 'classenr1');
        } else {
            const sheet = xlsx.utils.json_to_sheet([{ message: 'No data found' }]);
            xlsx.utils.book_append_sheet(workbook, sheet, 'classenr1');
        }

        if (examadmitData.length > 0) {
            const sheet = xlsx.utils.json_to_sheet(prepare(examadmitData));
            xlsx.utils.book_append_sheet(workbook, sheet, 'examadmit');
        } else {
            const sheet = xlsx.utils.json_to_sheet([{ message: 'No data found' }]);
            xlsx.utils.book_append_sheet(workbook, sheet, 'examadmit');
        }

        if (exammarksData.length > 0) {
            const sheet = xlsx.utils.json_to_sheet(prepare(exammarksData));
            xlsx.utils.book_append_sheet(workbook, sheet, 'exammarks1ds');
        } else {
            const sheet = xlsx.utils.json_to_sheet([{ message: 'No data found' }]);
            xlsx.utils.book_append_sheet(workbook, sheet, 'exammarks1ds');
        }

        // Write file
        xlsx.writeFile(workbook, OUTPUT_FILE);
        console.log(`[EXPORT]: Excel file "${OUTPUT_FILE}" created successfully.`);

        await mongoose.disconnect();
        console.log('[EXPORT]: Disconnected from MongoDB');
        process.exit(0);

    } catch (error) {
        console.error('[EXPORT]: Error:', error);
        process.exit(1);
    }
}

exportData();
