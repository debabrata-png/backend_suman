const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const FILES = ['SORT_BETC.xlsx', 'SORT_DIPLOMA.xlsx', 'SORT_Mtech.xlsx'];

const checkEmails = () => {
    FILES.forEach(file => {
        const filePath = path.join(__dirname, file);
        if (fs.existsSync(filePath)) {
            const wb = XLSX.readFile(filePath);
            const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

            let missingEmail = 0;
            let total = data.length;
            let duplicateEmail = 0;
            const emails = new Set();

            data.forEach(row => {
                const email = row.email ? String(row.email).trim() : '';
                if (!email) {
                    missingEmail++;
                } else {
                    if (emails.has(email)) {
                        duplicateEmail++;
                    }
                    emails.add(email);
                }
            });

            console.log(`\nFile: ${file}`);
            console.log(`Total Records: ${total}`);
            console.log(`Missing Email: ${missingEmail}`);
            console.log(`Duplicate Email: ${duplicateEmail}`);
            console.log(`Unique Emails: ${emails.size}`);
        }
    });
};

checkEmails();
