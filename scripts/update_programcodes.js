const mongoose = require('mongoose');
const excel = require('exceljs');
const path = require('path');
const User = require('../Models/user'); // Using the User model

// ============================================================================
// CONFIGURE YOUR DATABASE CONNECTION HERE
// ============================================================================
const DB_URI = 'mongodb://103.91.186.112/:27017/erpdb'; // <-- Replace this with your actual DB link

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

        console.log("Loading Excel file: updateprogramcode.xlsx...");
        const filePath = path.join(__dirname, '../updateprogramcode.xlsx'); // Relative to scripts folder
        const workbook = new excel.Workbook();
        await workbook.xlsx.readFile(filePath);

        const worksheet = workbook.worksheets[0];

        // Find column indices
        let colIdxProgramCode = -1;
        let colIdxProgram = -1;

        worksheet.getRow(1).eachCell((cell, colNumber) => {
            const header = String(cell.value || '').trim().toLowerCase();
            if (header === 'programcode' || header === 'program code') {
                colIdxProgramCode = colNumber;
            } else if (header === 'program') {
                colIdxProgram = colNumber;
            }
        });

        // Fallback or override if headers are differently named
        // You can manually set indices here if needed (1-based, e.g., A=1, B=2)
        if (colIdxProgramCode === -1) colIdxProgramCode = 1; // Assume column A
        if (colIdxProgram === -1) colIdxProgram = 2; // Assume column B

        console.log(`Using Column ${colIdxProgramCode} for 'programcode' and Column ${colIdxProgram} for 'program' (Replacement Value).`);

        let updatedCount = 0;
        let notFoundCount = 0;
        let errorsCount = 0;

        for (let i = 2; i <= worksheet.rowCount; i++) {
            const row = worksheet.getRow(i);
            const oldProgramCode = String(row.getCell(colIdxProgramCode).value || '').trim();
            const newProgram = String(row.getCell(colIdxProgram).value || '').trim();

            if (!oldProgramCode || !newProgram) {
                continue; // Skip empty rows
            }

            try {
                // Perform the update
                // Updating both numeric and string representations of colid just in case
                const result = await User.updateMany(
                    {
                        $or: [{ colid: COLID }, { colid: String(COLID) }],
                        role: { $regex: /^Student$/i },
                        programcode: { $regex: new RegExp(`^${oldProgramCode}$`, 'i') } // case-insensitive match
                    },
                    {
                        $set: {
                            programcode: newProgram
                        }
                    }
                );

                if (result.matchedCount > 0) {
                    console.log(`✅ [SUCCESS] Replaced '${oldProgramCode}' -> '${newProgram}' for ${result.modifiedCount} student(s).`);
                    updatedCount += result.modifiedCount;
                } else {
                    console.log(`⚠️ [NO MATCH] No students found for programcode '${oldProgramCode}'.`);
                    notFoundCount++;
                }

            } catch (err) {
                console.error(`❌ [ERROR] Failed to update for programcode '${oldProgramCode}':`, err.message);
                errorsCount++;
            }
        }

        console.log("\n=================================");
        console.log("UPDATE COMPLETED");
        console.log("=================================");
        console.log(`Total students updated: ${updatedCount}`);
        console.log(`Total program codes not found in DB: ${notFoundCount}`);
        console.log(`Total errors: ${errorsCount}`);

    } catch (err) {
        console.error("❌ Fatal Error:", err);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected from MongoDB.");
        process.exit(0);
    }
}

updateProgramCode();
