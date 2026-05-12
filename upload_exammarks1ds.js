const mongoose = require('mongoose');
const XLSX = require('xlsx');
const ExamMarks1ds = require('./Models/exammarks1ds');

const MONGODB_URI = "mongodb+srv://user3:Hello123456@cluster0.bhzac.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const EXCEL_FILE = './exammarks1ds_format.xlsx';
const BATCH_SIZE = 500;
const DELAY_MS = 500;

const connectDB = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("✅ MongoDB connected");
    } catch (err) {
        console.error("❌ MongoDB connection error:", err);
        process.exit(1);
    }
};

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const uploadExamMarks = async () => {
    await connectDB();

    try {
        console.log(`Reading data from: ${EXCEL_FILE}`);
        const workbook = XLSX.readFile(EXCEL_FILE);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const records = XLSX.utils.sheet_to_json(sheet, { defval: '' }); // use empty string for missing fields
        console.log(`Found ${records.length} records in Excel.`);

        if (records.length === 0) {
            console.log("No records to insert.");
            process.exit(0);
        }

        const formattedRecords = records.map(record => ({
            name: String(record.name || '').trim(),
            user: String(record.user || '').trim(),
            colid: Number(record.colid) || 0,
            program: String(record.program || '').trim(),
            examcode: String(record.examcode || '').trim(),
            month: String(record.month || '').trim(),
            year: String(record.year || '').trim(),
            status: String(record.status || '').trim(),
            regulation: String(record.regulation || '').trim(),
            semester: String(record.semester || '').trim(),
            branch: String(record.branch || '').trim(),
            papercode: String(record.papercode || '').trim(),
            papername: String(record.papername || '').trim(),
            // Ensure numeric fields are correctly parsed, or left undefined/null if empty
            thmax: record.thmax !== '' && record.thmax !== undefined ? Number(record.thmax) : undefined,
            prmax: record.prmax !== '' && record.prmax !== undefined ? Number(record.prmax) : undefined,
            iatmax: record.iatmax !== '' && record.iatmax !== undefined ? Number(record.iatmax) : undefined,
            iapmax: record.iapmax !== '' && record.iapmax !== undefined ? Number(record.iapmax) : undefined,
        }));

        console.log("Sample Record:", JSON.stringify(formattedRecords[0], null, 2));

        let totalInserted = 0;
        let batchCount = 0;

        for (let i = 0; i < formattedRecords.length; i += BATCH_SIZE) {
            const batch = formattedRecords.slice(i, i + BATCH_SIZE);
            batchCount++;
            try {
                console.log(`Inserting batch ${batchCount} (${batch.length} records)...`);
                const result = await ExamMarks1ds.insertMany(batch, { ordered: false });
                totalInserted += result.length;
                console.log(`   ✅ Batch ${batchCount} done. Total inserted so far: ${totalInserted}`);
            } catch (err) {
                if (err.writeErrors) {
                    totalInserted += (err.insertedDocs ? err.insertedDocs.length : 0);
                    console.warn(`   ⚠️ Batch ${batchCount} partial success: ${err.insertedDocs ? err.insertedDocs.length : 0} inserted, ${err.writeErrors.length} failed/duplicate.`);
                } else {
                    console.error(`   ❌ Batch ${batchCount} failed completely:`, err.message);
                }
            }

            if (i + BATCH_SIZE < formattedRecords.length) {
                await wait(DELAY_MS);
            }
        }

        console.log(`🏁 Upload complete. Total records inserted: ${totalInserted}`);

    } catch (err) {
        console.error("❌ Error during upload:", err);
    } finally {
        mongoose.connection.close();
        process.exit();
    }
};

uploadExamMarks();
