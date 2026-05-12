const xlsx = require('xlsx');
const fs = require('fs');

const filename = 'Student.xlsx';

try {
    const workbook = xlsx.readFile(filename);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Get headers
    const data = xlsx.utils.sheet_to_json(sheet);
    if (data.length > 0) {
        const output = "Keys: " + JSON.stringify(Object.keys(data[0]), null, 2) + "\n" +
            "Sample: " + JSON.stringify(data[0], null, 2);
        fs.writeFileSync('headers.txt', output);
    } else {
        fs.writeFileSync('headers.txt', "No data found");
    }

} catch (err) {
    fs.writeFileSync('headers.txt', "Error: " + err.message);
}
