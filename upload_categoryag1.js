const mongoose = require('mongoose');
const xlsx = require('xlsx');
const categoryds = require('./Models/categoryds');
const categoryag1 = require('./Models/categoryag1');

const MONGODB_URI = "mongodb+srv://user3:Hello123456@cluster0.bhzac.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const TARGET_COLID = 6050;

async function uploadData() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("✅ Connected to MongoDB");

        // 1. Read Excel file
        const workbook = xlsx.readFile('categoryag1.xlsx');
        const sheetName = workbook.SheetNames[0];
        const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
        console.log(`📊 Found ${rows.length} rows in Excel.`);

        let successCount = 0;
        let skipCount = 0;
        let errorCount = 0;

        for (const row of rows) {
            const categoryName = row['Category Name'];
            const categoryCode = row['Category Code'];
            const eduQual      = row['Education Qualification'];
            const excelDesc    = row['Description'];
            const excelColid   = row['colid'] || TARGET_COLID;
            const excelCounsellorName  = row['name'];
            const excelCounsellorEmail = row['user'];

            if (!categoryCode) {
                console.warn("⚠️ Skipping row missing 'Category Code'");
                skipCount++;
                continue;
            }

            // 2. Map with categoryds to get existing counselor data
            const existingCategory = await categoryds.findOne({ 
                colid: excelColid, 
                category_code: categoryCode 
            });

            let counsellors = [];
            if (existingCategory && Array.isArray(existingCategory.counsellors)) {
                // Start with existing counsellors
                counsellors = [...existingCategory.counsellors];
            }

            // If Excel provides a counsellor, add it if not already present
            if (excelCounsellorEmail) {
                const alreadyExists = counsellors.some(c => 
                    c.counsellor_email && c.counsellor_email.toLowerCase() === excelCounsellorEmail.toLowerCase()
                );

                if (!alreadyExists) {
                    counsellors.push({
                        counsellor_email: excelCounsellorEmail,
                        counsellor_name: excelCounsellorName || 'Unknown',
                        is_active: 'Yes'
                    });
                }
            }

            const createdBy = existingCategory ? existingCategory.created_by : 'Admin';
            
            // Priority: Excel Description > categoryds Description
            const description = excelDesc || (existingCategory ? existingCategory.description : '');

            // 3. Prepare data for categoryag1
            const newData = {
                colid: excelColid,
                category_name: categoryName || (existingCategory ? existingCategory.category_name : 'Unknown'),
                category_code: categoryCode,
                counsellors: counsellors,
                created_by: createdBy,
                description: description,
                education_qualification: eduQual || '',
                is_active: 'Yes'
            };

            try {
                // Using updateOne with upsert to avoid duplicates
                await categoryag1.updateOne(
                    { colid: excelColid, category_code: categoryCode },
                    { $set: newData },
                    { upsert: true }
                );
                successCount++;
            } catch (err) {
                console.error(`❌ Error uploading ${categoryCode}:`, err.message);
                errorCount++;
            }
        }

        console.log(`\n🏁 Upload Complete!`);
        console.log(`✅ Success: ${successCount}`);
        console.log(`⚠️ Skipped: ${skipCount}`);
        console.log(`❌ Errors: ${errorCount}`);

    } catch (error) {
        console.error("💥 Critical script error:", error);
    } finally {
        await mongoose.connection.close();
        process.exit();
    }
}

uploadData();
