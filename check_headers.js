const fs = require('fs');
const xlsx = require('xlsx');

const checkFile = (filename) => {
    try {
        const workbook = xlsx.readFile(filename);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet, { length: 1 }); // Read only 1 row
        if (data.length > 0) {
            fs.appendFileSync('headers.txt', `\nHeaders for ${filename}:\n${JSON.stringify(Object.keys(data[0]))}\n`);
        } else {
            fs.appendFileSync('headers.txt', `\n${filename} is empty or unreadable.\n`);
        }
    } catch (err) {
        fs.appendFileSync('headers.txt', `Error reading ${filename}: ${err.message}\n`);
    }
};

if (fs.existsSync('headers.txt')) fs.unlinkSync('headers.txt');
checkFile('ItemList_pu_data.xlsx');
checkFile('vendor_data_pu.xlsx');
