const mongoose = require('mongoose');
const xlsx = require('xlsx');
const dotenv = require('dotenv');
const User = require('./Models/user');

// Load environment variables
dotenv.config({ path: './config.env' });

const DB_URL = process.env.DATABASE2;
const TARGET_COLID = 100100;
const EXCEL_FILE_NAME = 'Users_Colid_100100_Review.xlsx';

if (!DB_URL) {
    console.error('Error: DATABASE2 environment variable is not defined in config.env');
    process.exit(1);
}

async function exportUsers() {
    try {
        console.log(`Connecting to database...`);
        await mongoose.connect(DB_URL);
        console.log('MongoDB successfully connected.');

        // 1. Fetch Users with role "All" and targeted colid
        console.log(`Fetching users with role "All" and colid ${TARGET_COLID}...`);
        const users = await User.find({ 
            colid: TARGET_COLID, 
            role: 'All' 
        }).lean();

        console.log(`Found ${users.length} users.`);

        if (users.length === 0) {
            console.log('No users found matching the criteria. Excel file will not be generated.');
            return;
        }

        // 2. Prepare data for Excel
        const excelData = users.map(user => ({
            Email: user.email,
            Name: user.name,
            Phone: user.phone || 'N/A',
            Department: user.department || 'N/A',
            Current_Role: user.role,
            Institution: user.institution || 'N/A',
            Colid: user.colid,
            New_Purchasepu: '', // Empty for review
            New_Store: '',      // Empty for review
            New_AO: '',         // Empty for review
            New_HOI: ''         // Empty for review
        }));

        // 4. Create Workbook and Worksheet
        const workbook = xlsx.utils.book_new();
        const worksheet = xlsx.utils.json_to_sheet(excelData);

        // Auto-size columns (rough estimation)
        const colWidths = Object.keys(excelData[0]).map(key => ({
            wch: Math.max(key.length, ...excelData.map(row => (row[key] ? row[key].toString().length : 0))) + 2
        }));
        worksheet['!cols'] = colWidths;

        xlsx.utils.book_append_sheet(workbook, worksheet, 'Users_Review');

        // 5. Save to file
        xlsx.writeFile(workbook, EXCEL_FILE_NAME);
        console.log(`\nSuccessfully exported ${users.length} records to ${EXCEL_FILE_NAME}`);
        console.log(`Please review the file and mark 'X' or the new role value in the 'New_...' columns.`);

    } catch (error) {
        console.error('An error occurred:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

exportUsers();
