const xlsx = require('xlsx');
const path = require('path');

const filePath = 'f:\\backend_suman-main\\PDA-Student.xlsx';
const workbook = xlsx.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

console.log('Headers:', data[0]);
console.log('First row of data:', data[1]);
