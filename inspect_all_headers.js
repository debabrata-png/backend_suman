const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const files = [
    'SORT_BETC.xlsx',
    'SORT_DIPLOMA.xlsx',
    'SORT_Mtech.xlsx',
    'WORK LOAD SORT.xlsx',
    'classenr_sort.xlsx'
];

const inspectHeaders = () => {
    files.forEach(file => {
        const filePath = path.join(__dirname, file);
        if (fs.existsSync(filePath)) {
            try {
                const workbook = XLSX.readFile(filePath);
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                // Get headers (first row)
                const headers = XLSX.utils.sheet_to_json(sheet, { header: 1 })[0];
                console.log(`\n--- Headers for ${file} ---`);
                console.log(headers);

                // Print a sample row to see data types
                const data = XLSX.utils.sheet_to_json(sheet);
                if (data.length > 0) {
                    console.log(`Sample row for ${file}:`);
                    console.log(data[0]);
                }
            } catch (err) {
                console.error(`Error reading ${file}:`, err.message);
            }
        } else {
            console.error(`File not found: ${file}`);
        }
    });
};

inspectHeaders();
