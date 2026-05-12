const mongoose = require('mongoose');
const xlsx = require('xlsx');
const dotenv = require('dotenv');
const User = require('./Models/user');

// Load environment variables
dotenv.config({ path: './config.env' });

const DB_URL = process.env.DATABASE2;
const TARGET_COLID = 100100;
const EXCEL_FILE_NAME = 'New_Admin_Users_100100.xlsx';
const SHORT_NAME = 'dypcebeak'; // Based on user example

if (!DB_URL) {
    console.error('Error: DATABASE2 environment variable is not defined in config.env');
    process.exit(1);
}

async function generateExcel() {
    try {
        console.log(`Connecting to database...`);
        await mongoose.connect(DB_URL);
        console.log('MongoDB successfully connected.');

        // 1. Fetch one user to get current institution and department name
        const sampleUser = await User.findOne({ colid: TARGET_COLID, institution: { $exists: true, $ne: null } }).lean();
        const institutionName = sampleUser && sampleUser.institution ? sampleUser.institution : 'Dr D Y Patil College of Education (B.Ed), Akurdi';
        const departmentName = sampleUser && sampleUser.department ? sampleUser.department : 'Administration';
        console.log(`Target Institution: ${institutionName}`);
        console.log(`Target Department: ${departmentName}`);

        // 2. Define the new admin roles and their email prefixes
        const roles = [
            { role: 'Purchasepu', prefix: 'purchase', nameSuffix: 'Purchase' },
            { role: 'Store', prefix: 'store', nameSuffix: 'Store' },
            { role: 'AO', prefix: 'ao', nameSuffix: 'AO' },
            { role: 'HOI', prefix: 'hoi', nameSuffix: 'HOI' }
        ];

        // 3. Prepare data for Excel
        const excelData = roles.map(r => ({
            email: `${r.prefix}@${SHORT_NAME}.edu.in`,
            name: `${SHORT_NAME.toUpperCase()} ${r.nameSuffix}`,
            phone: 'NA',
            password: 'Password@123',
            role: r.role,
            regno: `${r.prefix}_${TARGET_COLID}`,
            programcode: 'NA',
            admissionyear: '2025-26',
            semester: 'NA',
            section: 'NA',
            department: departmentName,
            colid: TARGET_COLID,
            status: 1,
            institution: institutionName
        }));

        // 4. Create Workbook and Worksheet
        const workbook = xlsx.utils.book_new();
        const worksheet = xlsx.utils.json_to_sheet(excelData);

        // Auto-size columns
        const colWidths = Object.keys(excelData[0]).map(key => ({
            wch: Math.max(key.length, ...excelData.map(row => (row[key] ? row[key].toString().length : 0))) + 2
        }));
        worksheet['!cols'] = colWidths;

        xlsx.utils.book_append_sheet(workbook, worksheet, 'New_Admins');

        // 5. Save to file
        xlsx.writeFile(workbook, EXCEL_FILE_NAME);
        console.log(`\nSuccessfully generated ${excelData.length} new admin accounts in ${EXCEL_FILE_NAME}`);
        console.log(`Please review the generated data below:`);
        console.table(excelData.map(d => ({ Email: d.email, Name: d.name, Role: d.role, Institution: d.institution, Department: d.department })));

    } catch (error) {
        console.error('An error occurred:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

generateExcel();
