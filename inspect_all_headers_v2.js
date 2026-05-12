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

const outputFile = 'headers_info.txt';
let output = '';

const inspectHeaders = () => {
    files.forEach(file => {
        const filePath = path.join(__dirname, file);
        if (fs.existsSync(filePath)) {
            try {
                const workbook = XLSX.readFile(filePath);
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const headers = XLSX.utils.sheet_to_json(sheet, { header: 1 })[0];

                output += `\n--- Headers for ${file} ---\n`;
                output += JSON.stringify(headers, null, 2) + '\n';

                const data = XLSX.utils.sheet_to_json(sheet);
                if (data.length > 0) {
                    output += `Sample row for ${file}:\n`;
                    output += JSON.stringify(data[0], null, 2) + '\n';
                }
            } catch (err) {
                output += `Error reading ${file}: ${err.message}\n`;
            }
        } else {
            output += `File not found: ${file}\n`;
        }
    });

    fs.writeFileSync(outputFile, output);
    console.log(`Info written to ${outputFile}`);
};

inspectHeaders();
