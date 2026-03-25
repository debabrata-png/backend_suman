/**
 * upload_studentledger.js
 * ─────────────────────────
 * Reads an Excel file and uploads student ledger data into the Ledgerstud collection.
 *
 * Usage:
 *   node upload_studentledger.js
 *
 * Excel file: Place your Excel file as "studentledger.xlsx" in the same directory.
 *
 * Expected Excel columns (header row must match exactly):
 *   name, user, feegroup, regno, student, feeitem, amount, paid, concession, balance,
 *   cash, upi, cheque, card, pg, neft, doclink, feebook, feecounter, paymode,
 *   paydetails, feecategory, semester, cashbook, institution, type, installment,
 *   comments, academicyear, colid, classdate, duedate, paiddate, status,
 *   programcode, admissionyear
 *
 * Notes:
 *   - "colid" must be provided in the Excel or hardcoded below.
 *   - "classdate" is required. Use format YYYY-MM-DD or any parseable date string.
 *   - Rows with missing required fields (name, user, feegroup, regno, student,
 *     feeitem, academicyear, classdate, status) will be skipped with a warning.
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const XLSX = require('xlsx');
const path = require('path');
const Ledgerstud = require('./Models/ledgerstud');

dotenv.config({ path: './config.env' });

// ──────────────── CONFIGURATION ────────────────
const EXCEL_FILE = path.join(__dirname, 'studentfees_ledgerstud_format.xlsx');
const SHEET_NAME = null; // null = use the first sheet
const DEFAULT_COLID = 6050; // fallback if colid not in Excel
const DEFAULT_USER = ''; // fallback if user not in Excel
const BATCH_SIZE = 500; // insert in batches
// ────────────────────────────────────────────────

const REQUIRED_FIELDS = ['name', 'feegroup', 'regno', 'student', 'feeitem', 'academicyear', 'classdate', 'status'];

function parseDate(val) {
    if (!val) return null;
    if (val instanceof Date) return val;
    // Excel serial number
    if (typeof val === 'number') {
        const excelEpoch = new Date(1899, 11, 30);
        return new Date(excelEpoch.getTime() + val * 86400000);
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
}

function parseNumber(val) {
    if (val === null || val === undefined || val === '') return undefined;
    const n = Number(val);
    return isNaN(n) ? undefined : n;
}

function cleanString(val) {
    if (val === null || val === undefined) return undefined;
    return String(val).trim();
}

async function main() {
    try {
        // Connect to DB
        const DB = process.env.DATABASE2;
        if (!DB) {
            console.error('❌ DATABASE2 not found in config.env!');
            process.exit(1);
        }
        await mongoose.connect(DB);
        console.log('✅ Connected to DB');

        // Read Excel
        console.log(`📂 Reading: ${EXCEL_FILE}`);
        const workbook = XLSX.readFile(EXCEL_FILE);
        const sheetName = SHEET_NAME || workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        if (!sheet) {
            console.error(`❌ Sheet "${sheetName}" not found!`);
            process.exit(1);
        }

        const rawData = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        console.log(`📊 Found ${rawData.length} rows in sheet "${sheetName}"`);

        if (rawData.length === 0) {
            console.error('❌ No data found in Excel!');
            process.exit(1);
        }

        // Show detected columns
        const headers = Object.keys(rawData[0]);
        console.log(`📋 Detected columns: ${headers.join(', ')}\n`);

        // Transform rows
        const validRecords = [];
        const skippedRows = [];

        rawData.forEach((row, idx) => {
            const rowNum = idx + 2; // +2 for 1-indexed + header row

            const record = {
                name: cleanString(row.name),
                user: cleanString(row.user) || DEFAULT_USER,
                feegroup: cleanString(row.feegroup),
                regno: cleanString(row.regno),
                student: cleanString(row.student),
                feeitem: cleanString(row.feeitem),
                amount: parseNumber(row.amount),
                paid: parseNumber(row.paid),
                concession: parseNumber(row.concession),
                balance: parseNumber(row.balance),
                cash: parseNumber(row.cash),
                upi: parseNumber(row.upi),
                cheque: parseNumber(row.cheque),
                card: parseNumber(row.card),
                pg: parseNumber(row.pg),
                neft: parseNumber(row.neft),
                doclink: cleanString(row.doclink),
                feebook: cleanString(row.feebook),
                feecounter: cleanString(row.feecounter),
                paymode: cleanString(row.paymode),
                paydetails: cleanString(row.paydetails),
                feecategory: cleanString(row.feecategory),
                semester: cleanString(row.semester),
                cashbook: cleanString(row.cashbook),
                institution: cleanString(row.institution),
                type: cleanString(row.type),
                installment: cleanString(row.installment),
                comments: cleanString(row.comments),
                academicyear: cleanString(row.academicyear),
                colid: parseNumber(row.colid) || DEFAULT_COLID,
                classdate: parseDate(row.classdate),
                duedate: parseDate(row.duedate),
                paiddate: parseDate(row.paiddate),
                status: cleanString(row.status),
                programcode: cleanString(row.programcode),
                admissionyear: cleanString(row.admissionyear),
            };

            // Validate required fields
            const missing = REQUIRED_FIELDS.filter(f => !record[f]);
            if (missing.length > 0) {
                skippedRows.push({ row: rowNum, reason: `Missing: ${missing.join(', ')}` });
                return;
            }

            // Remove undefined fields
            Object.keys(record).forEach(k => {
                if (record[k] === undefined) delete record[k];
            });

            validRecords.push(record);
        });

        console.log(`✅ Valid records: ${validRecords.length}`);
        if (skippedRows.length > 0) {
            console.log(`⚠️  Skipped rows: ${skippedRows.length}`);
            skippedRows.forEach(s => console.log(`   Row ${s.row}: ${s.reason}`));
        }

        if (validRecords.length === 0) {
            console.error('\n❌ No valid records to insert!');
            process.exit(1);
        }

        // Preview first 3 records
        console.log('\n📋 Preview (first 3 records):');
        validRecords.slice(0, 3).forEach((r, i) => {
            console.log(`  ${i + 1}. ${r.name} | ${r.regno} | ${r.feeitem} | ₹${r.amount || 0} | ${r.status}`);
        });

        // Insert in batches
        console.log(`\n🔄 Inserting ${validRecords.length} records in batches of ${BATCH_SIZE}...`);
        let totalInserted = 0;

        for (let i = 0; i < validRecords.length; i += BATCH_SIZE) {
            const batch = validRecords.slice(i, i + BATCH_SIZE);
            const result = await Ledgerstud.insertMany(batch, { ordered: false });
            totalInserted += result.length;
            console.log(`   Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${result.length} records inserted`);
        }

        console.log(`\n✅ Done! Total inserted: ${totalInserted} records into Ledgerstud collection.`);

    } catch (error) {
        if (error.code === 'ENOENT') {
            console.error(`❌ File not found: ${EXCEL_FILE}`);
            console.error('   Place your Excel file as "studentledger.xlsx" in the backend-main directory.');
        } else {
            console.error('❌ Error:', error.message);
        }
    } finally {
        await mongoose.connection.close();
        console.log('🔌 DB connection closed.');
    }
}

main();
