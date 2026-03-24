const XLSX = require('xlsx');

function checkAllHeaders(filePath) {
    try {
        console.log(`\n--- ALL Headers for ${filePath} ---`);
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Use sheet_to_json with header:1 to see raw headers
        const rows = XLSX.utils.sheet_to_json(sheet, {header: 1});
        if (rows.length > 0) {
            console.log('Row 1 (Heades?):', rows[0]);
        }
        
        // See if colid is anywhere in any row
        const data = XLSX.utils.sheet_to_json(sheet);
        if (data.length > 0) {
            const allKeys = new Set();
            data.forEach(row => Object.keys(row).forEach(k => allKeys.add(k)));
            console.log('All found keys in data:', Array.from(allKeys));
        }
    } catch (e) {
        console.error(`Error reading ${filePath}: ${e.message}`);
    }
}

checkAllHeaders('./courselist.xlsx');
checkAllHeaders('./studentlist.xlsx');
