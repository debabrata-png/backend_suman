const excel = require('exceljs');
const path = require('path');

async function readHeaders() {
    const filePath = path.join(__dirname, 'updateprogramcode.xlsx');
    const workbook = new excel.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0];
    
    const headers = [];
    worksheet.getRow(1).eachCell((cell, colNumber) => {
        headers.push(cell.value);
    });
    console.log("Headers:", headers);

    const firstRowValues = [];
    worksheet.getRow(2).eachCell((cell, colNumber) => {
        firstRowValues.push(cell.value);
    });
    console.log("First row values:", firstRowValues);
}

readHeaders().catch(console.error);
