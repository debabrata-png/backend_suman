const xlsx = require('xlsx');
const fs = require('fs');

try {
    const workbook = xlsx.readFile('CPS_Student.xlsx');
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    fs.writeFileSync('excel_headers.json', JSON.stringify({
        headers: data[0],
        firstRow: data[1],
        secondRow: data[2]
    }, null, 2));
    console.log("Headers written to excel_headers.json");
} catch (e) {
    console.error("Error reading excel:", e.message);
}
