const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const FILES = ['SORT_BETC.xlsx', 'SORT_DIPLOMA.xlsx', 'SORT_Mtech.xlsx'];

const checkUndefined = () => {
    FILES.forEach(file => {
        const filePath = path.join(__dirname, file);
        if (!fs.existsSync(filePath)) {
            console.log(`File not found: ${file}`);
            return;
        }

        console.log(`\n--- Analyzing ${file} ---`);
        const workbook = XLSX.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];

        // Get headers first
        const headers = XLSX.utils.sheet_to_json(sheet, { header: 1 })[0];
        const data = XLSX.utils.sheet_to_json(sheet); // default matches headers to keys

        console.log(`Total Records: ${data.length}`);
        console.log(`Headers detected: ${headers.join(', ')}`);

        const missingCounts = {};
        headers.forEach(h => missingCounts[h] = 0);

        data.forEach(row => {
            headers.forEach(header => {
                const val = row[header];
                // Check for undefined, null, or empty string (if trim is safe)
                if (val === undefined || val === null || String(val).trim() === '') {
                    missingCounts[header]++;
                }
            });
        });

        console.log("Missing/Undefined Field Counts:");
        let foundIssue = false;
        for (const [key, count] of Object.entries(missingCounts)) {
            if (count > 0) {
                console.log(`  ${key}: ${count} missing`);
                foundIssue = true;
            }
        }
        if (!foundIssue) console.log("  No missing fields found based on headers.");
    });
};

checkUndefined();
