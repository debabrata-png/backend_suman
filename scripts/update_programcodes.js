const mongoose = require('mongoose');
const excel = require('exceljs');
const path = require('path');
const User = require('../Models/user'); // Using the User model

// ============================================================================
// CONFIGURE YOUR DATABASE CONNECTION HERE
// ============================================================================
const DB_URI = 'mongodb://localhost:27017/erpdb'; // <-- Replace this with your actual DB link

const COLID = 10050;

async function updateProgramCode() {
    if (DB_URI === 'YOUR_DB_LINK_HERE') {
        console.error("❌ PLEASE SET YOUR DB_URI IN THE SCRIPT BEFORE RUNNING.");
        process.exit(1);
    }

    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(DB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log("✅ Successfully connected to MongoDB.");

        console.log("Loading Excel file: updateprogramcode1.xlsx...");
        const filePath = path.join(__dirname, '../updateprogramcode1.xlsx'); // Relative to scripts folder
        const workbook = new excel.Workbook();
        await workbook.xlsx.readFile(filePath);

        const worksheet = workbook.worksheets[0];

        // Find column indices from headers
        // Expected headers: 'Programme Name', 'Department', 'Department code', 'Programme Code'
        let colIdxProgramName = -1;
        let colIdxDepartment = -1;
        let colIdxDepartmentCode = -1;
        let colIdxProgramCode = -1;

        worksheet.getRow(1).eachCell((cell, colNumber) => {
            const header = String(cell.value || '').trim().toLowerCase();
            if (header === 'programme name' || header === 'program name') {
                colIdxProgramName = colNumber;
            } else if (header === 'department') {
                colIdxDepartment = colNumber;
            } else if (header === 'department code') {
                colIdxDepartmentCode = colNumber;
            } else if (header === 'programme code' || header === 'program code' || header === 'programcode') {
                colIdxProgramCode = colNumber;
            }
        });

        // Fallback to positional columns if headers not detected
        // Column A=1: Programme Name, B=2: Department, C=3: Department code, D=4: Programme Code
        if (colIdxProgramName === -1) colIdxProgramName = 1;
        if (colIdxDepartment === -1) colIdxDepartment = 2;
        if (colIdxDepartmentCode === -1) colIdxDepartmentCode = 3;
        if (colIdxProgramCode === -1) colIdxProgramCode = 4;

        console.log(`Column mapping:`);
        console.log(`  Col ${colIdxProgramName}    -> Programme Name`);
        console.log(`  Col ${colIdxDepartment}    -> Department`);
        console.log(`  Col ${colIdxDepartmentCode}    -> Department Code`);
        console.log(`  Col ${colIdxProgramCode}    -> Programme Code`);

        let updatedCount = 0;
        let notFoundCount = 0;
        let skippedCount = 0;
        let errorsCount = 0;

        for (let i = 2; i <= worksheet.rowCount; i++) {
            const row = worksheet.getRow(i);

            const programmeName = String(row.getCell(colIdxProgramName).value ?? '').trim();
            const department = String(row.getCell(colIdxDepartment).value ?? '').trim();
            const departmentCode = String(row.getCell(colIdxDepartmentCode).value ?? '').trim();
            const programCode = String(row.getCell(colIdxProgramCode).value ?? '').trim();

            // Skip rows that have no programme code (nothing to match on)
            if (!programCode) {
                console.log(`⏭️  [SKIP] Row ${i}: No Programme Code — skipping.`);
                skippedCount++;
                continue;
            }

            // Build the $set payload — only include fields that have values
            const setPayload = {};
            if (programmeName) setPayload.programcode = programmeName;
            if (department) setPayload.department = department;
            // programcode is always set to itself (normalises any casing differences)
            setPayload.programcode = programCode;

            try {
                const result = await User.updateMany(
                    {
                        $or: [{ colid: COLID }, { colid: String(COLID) }],
                        role: { $regex: /^Student$/i },
                        programcode: { $regex: new RegExp(`^${programCode}$`, 'i') } // case-insensitive match
                    },
                    { $set: setPayload }
                );

                if (result.matchedCount > 0) {
                    console.log(
                        `✅ [SUCCESS] ProgramCode '${programCode}' | Dept '${department}' | DeptCode '${departmentCode}' | ProgName '${programmeName}' — updated ${result.modifiedCount} student(s).`
                    );
                    updatedCount += result.modifiedCount;
                } else {
                    console.log(`⚠️  [NO MATCH] No students found for programcode '${programCode}'.`);
                    notFoundCount++;
                }

            } catch (err) {
                console.error(`❌ [ERROR] Failed to update for programcode '${programCode}':`, err.message);
                errorsCount++;
            }
        }

        console.log("\n=================================");
        console.log("UPDATE COMPLETED");
        console.log("=================================");
        console.log(`Total students updated  : ${updatedCount}`);
        console.log(`Programme codes skipped : ${skippedCount}`);
        console.log(`Codes not found in DB   : ${notFoundCount}`);
        console.log(`Total errors            : ${errorsCount}`);

    } catch (err) {
        console.error("❌ Fatal Error:", err);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected from MongoDB.");
        process.exit(0);
    }
}

updateProgramCode();