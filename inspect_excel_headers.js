const XLSX = require('xlsx');
const FILE_PATH = './PIMR_Student.xlsx';

try {
    const workbook = XLSX.readFile(FILE_PATH);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const headers = XLSX.utils.sheet_to_json(sheet, { header: 1 })[0];
    console.log("Headers:", headers);

    // Also print first row of data to see if keys match headers (when using sheet_to_json without header:1, keys are headers)
    const rawData = XLSX.utils.sheet_to_json(sheet);
    if (rawData.length > 0) {
        console.log("First row keys:", Object.keys(rawData[0]));
        console.log("First row sample:", rawData[0]);
    } else {
        console.log("No data found in sheet");
    }

} catch (err) {
    console.error("Error reading file:", err);
}
