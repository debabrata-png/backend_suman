const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const STUDENT_FILE = 'PILS  STUDENT.xlsx';
const WORKLOAD_FILE = 'PILS WORKLOAD.xlsx';

const debugData = () => {
    // 1. Inspect Student Data
    console.log(`--- Inspecting ${STUDENT_FILE} ---`);
    if (fs.existsSync(path.join(__dirname, STUDENT_FILE))) {
        const wb = XLSX.readFile(path.join(__dirname, STUDENT_FILE));
        const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

        const programCodes = new Set();
        const semesters = new Set();

        data.forEach(row => {
            programCodes.add(row.programcode);
            semesters.add(row.semester);
        });

        console.log(`Unique Program Codes (Student):`, Array.from(programCodes));
        console.log(`Unique Semesters (Student):`, Array.from(semesters));
        console.log(`Sample Student Row:`, JSON.stringify(data[0], null, 2));
    } else {
        console.log("Student file not found.");
    }

    // 2. Inspect Workload Data
    console.log(`\n--- Inspecting ${WORKLOAD_FILE} ---`);
    if (fs.existsSync(path.join(__dirname, WORKLOAD_FILE))) {
        const wb = XLSX.readFile(path.join(__dirname, WORKLOAD_FILE));
        const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

        const programCodes = new Set();
        const semesters = new Set();

        data.forEach(row => {
            programCodes.add(row.programcode);
            semesters.add(row.semester);
        });

        console.log(`Unique Program Codes (Workload):`, Array.from(programCodes));
        console.log(`Unique Semesters (Workload):`, Array.from(semesters));
        console.log(`Sample Workload Row:`, JSON.stringify(data[0], null, 2));
    } else {
        console.log("Workload file not found.");
    }
};

debugData();
