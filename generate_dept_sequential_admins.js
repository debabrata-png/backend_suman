const mongoose = require('mongoose');
const xlsx = require('xlsx');
const dotenv = require('dotenv');
const User = require('./Models/user');

// Load environment variables
dotenv.config({ path: './config.env' });

const DB_URL = process.env.DATABASE2;
const TARGET_COLID = 100100;
const EXCEL_FILE_NAME = 'Sequential_Dept_Admin_Users_100100.xlsx';
const DOMAIN = 'dypvp.edu.in'; // Fixed domain as per user instruction

if (!DB_URL) {
    console.error('Error: DATABASE2 environment variable is not defined in config.env');
    process.exit(1);
}

async function generateExcel() {
    try {
        console.log(`Connecting to database...`);
        await mongoose.connect(DB_URL);
        console.log('MongoDB successfully connected.');

        // 1. Fetch unique combinations of institution and department for the target colid
        console.log(`Identifying unique entities (Institution + Department) for colid ${TARGET_COLID}...`);
        const entities = await User.aggregate([
            { $match: { colid: TARGET_COLID } },
            { 
                $group: { 
                    _id: { 
                        institution: "$institution", 
                        department: "$department" 
                    } 
                } 
            },
            { $sort: { "_id.institution": 1, "_id.department": 1 } }
        ]);

        console.log(`Found ${entities.length} unique entity combinations.`);

        if (entities.length === 0) {
            console.log('No entities found. Excel file will not be generated.');
            return;
        }

        // 2. Prepare data for Excel
        const excelData = [];
        const roles = [
            { role: 'Purchasepu', prefix: 'purchase', nameSuffix: 'Purchase' },
            { role: 'Store', prefix: 'store', nameSuffix: 'Store' },
            { role: 'AO', prefix: 'ao', nameSuffix: 'AO' },
            { role: 'HOI', prefix: 'hoi', nameSuffix: 'HOI' }
        ];

        entities.forEach((entity, entityIndex) => {
            const seqNum = entityIndex + 1;
            const instName = entity._id.institution || 'Unknown Institution';
            const deptName = entity._id.department || 'NA';
            
            roles.forEach(r => {
                excelData.push({
                    email: `${r.prefix}${seqNum}@${DOMAIN}`,
                    name: `${instName} - ${deptName} ${r.nameSuffix}`,
                    phone: 'NA',
                    password: 'Password@123',
                    role: r.role,
                    regno: `${r.prefix}${seqNum}_${TARGET_COLID}`,
                    programcode: 'NA',
                    admissionyear: '2025-26',
                    semester: 'NA',
                    section: 'NA',
                    department: deptName,
                    colid: TARGET_COLID,
                    status: 1,
                    institution: instName
                });
            });
        });

        if (excelData.length === 0) {
            console.log('No departments found. Excel file will not be generated.');
            return;
        }

        // 4. Create Workbook and Worksheet
        const workbook = xlsx.utils.book_new();
        const worksheet = xlsx.utils.json_to_sheet(excelData, {
            header: [
                'email', 'name', 'phone', 'password', 'role', 'regno',
                'programcode', 'admissionyear', 'semester', 'section',
                'department', 'colid', 'status', 'institution'
            ]
        });

        // Auto-size columns
        const colWidths = Object.keys(excelData[0]).map(key => ({
            wch: Math.max(key.length, ...excelData.map(row => (row[key] ? row[key].toString().length : 0))) + 2
        }));
        worksheet['!cols'] = colWidths;

        xlsx.utils.book_append_sheet(workbook, worksheet, 'Sequential_Admins');

        // 5. Save to file
        xlsx.writeFile(workbook, EXCEL_FILE_NAME);
        console.log(`\nSuccessfully generated ${excelData.length} records (${entities.length} entities) in ${EXCEL_FILE_NAME}`);
        console.log(`Email pattern used: [role][number]@${DOMAIN}`);
        console.log(`\nPlease review the generated data below:`);
        console.table(excelData.map(d => ({ 
            Email: d.email, 
            Name: d.name, 
            Role: d.role, 
            Institution: d.institution, 
            Department: d.department 
        })));

    } catch (error) {
        console.error('An error occurred:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

generateExcel();
