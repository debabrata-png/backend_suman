const XLSX = require('xlsx');
const fs = require('fs');
try {
    const workbook = XLSX.readFile('CRM Stage Update.xlsx');
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const range = XLSX.utils.decode_range(sheet['!ref']);
    let output = '';
    for (let R = range.s.r; R <= range.e.r; ++R) {
        const cellA = sheet[XLSX.utils.encode_cell({ r: R, c: 0 })]; // Column A
        const cellB = sheet[XLSX.utils.encode_cell({ r: R, c: 1 })]; // Column B
        output += `Row ${R}: A=${cellA ? cellA.v : ''}, B=${cellB ? cellB.v : ''}\n`;
    }
    fs.writeFileSync('crm_data.txt', output);
    console.log("Data written to crm_data.txt");
} catch (error) {
    console.error("Error reading file:", error);
}
