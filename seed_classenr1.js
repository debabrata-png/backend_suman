const mongoose = require('mongoose');
const XLSX = require('xlsx');
const Classenr1 = require('./Models/classenr1');

const MONGODB_URI = "mongodb+srv://user3:Hello123456@cluster0.bhzac.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const FILE_PATH = './classenr_dhss_output.xlsx';
const BATCH_SIZE = 500;
const DELAY_MS = 1000; // 1 second delay between batches

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

const seedData = async () => {
    await connectDB();

    try {
        if (!require('fs').existsSync(FILE_PATH)) {
            throw new Error(`File not found: ${FILE_PATH}`);
        }

        console.log(`Reading file from: ${FILE_PATH}`);
        const workbook = XLSX.readFile(FILE_PATH);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(sheet);
        console.log(`Found ${rawData.length} records in Excel`);

        const dataToInsert = rawData.map(row => ({
            name: row.name,
            user: row.user,
            colid: Number(row.colid),
            year: String(row.year || ''),
            program: row.program,
            programcode: String(row.programcode || ''),
            course: row.course,
            coursecode: String(row.coursecode || ''),
            student: row.student,
            regno: String(row.regno || ''),
            learning: row.learning,
            gender: row.gender,
            classgroup: String(row.classgroup || ''),
            coursetype: row.coursetype,
            semester: String(row.semester || ''),
            active: row.active,
            status1: row.status,
            comments: ''
        }));

        if (dataToInsert.length > 0) {
            console.log("Sample Record:", JSON.stringify(dataToInsert[0], null, 2));
            console.log(`Starting insertion of ${dataToInsert.length} records with batch size ${BATCH_SIZE}...`);

            let totalInserted = 0;
            let batchCount = 0;

            for (let i = 0; i < dataToInsert.length; i += BATCH_SIZE) {
                const batch = dataToInsert.slice(i, i + BATCH_SIZE);
                batchCount++;
                try {
                    console.log(`Inserting batch ${batchCount} (${batch.length} records)...`);
                    const result = await Classenr1.insertMany(batch, { ordered: false });
                    totalInserted += result.length;
                    console.log(`   ✅ Batch ${batchCount} done. Total inserted so far: ${totalInserted}`);
                } catch (err) {
                    if (err.writeErrors) {
                        totalInserted += err.insertedDocs.length;
                        console.warn(`   ⚠️ Batch ${batchCount} partial success: ${err.insertedDocs.length} inserted, ${err.writeErrors.length} failed/duplicate.`);
                    } else {
                        console.error(`   ❌ Batch ${batchCount} failed completely:`, err.message);
                    }
                }

                if (i + BATCH_SIZE < dataToInsert.length) {
                    console.log(`   Sleeping for ${DELAY_MS}ms...`);
                    await wait(DELAY_MS);
                }
            }

            console.log(`🏁 Insertion complete. Total records inserted: ${totalInserted}`);
        } else {
            console.log("No data to insert.");
        }

    } catch (err) {
        console.error("❌ Error seeding data:", err);
    } finally {
        mongoose.connection.close();
        process.exit();
    }
};

seedData();
