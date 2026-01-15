const xlsx = require('xlsx');

const workbook = xlsx.readFile('SOPR_workload.xlsx');
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

console.log('Headers:', data[0]);
