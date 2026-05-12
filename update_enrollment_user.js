const mongoose = require('mongoose');
const XLSX = require('xlsx');
const Classenr1 = require('./Models/classenr1');

const MONGODB_URI = "mongodb+srv://user3:Hello123456@cluster0.bhzac.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const STUDENT_FILE = './studentlist.xlsx';

const updateEnrollmentsByColid = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("✅ MongoDB connected");

        // Read student file to get unique colids
        console.log(`Reading student data to extract colids from: ${STUDENT_FILE}`);
        const studentWorkbook = XLSX.readFile(STUDENT_FILE);
        const studentSheet = studentWorkbook.Sheets[studentWorkbook.SheetNames[0]];
        const studentRecords = XLSX.utils.sheet_to_json(studentSheet);
        
        const colids = [...new Set(studentRecords.map(s => Number(s.colid)).filter(c => !isNaN(c)))];
        console.log(`Found unique colids in student list: ${colids.join(', ')}`);

        if (colids.length === 0) {
            console.log("No valid colids found in student list. Aborting update.");
            return;
        }

        console.log(`Updating 'user' field in 'classenr1' records where colid is in [${colids.join(', ')}]...`);
        const result = await Classenr1.updateMany(
            { 
              colid: { $in: colids }
            }, 
            { $set: { user: 'adminall@bmusurat.ac.in' } }
        );

        console.log(`✅ Successfully updated ${result.modifiedCount} records.`);
    } catch (err) {
        console.error("❌ MongoDB operation error:", err);
    } finally {
        mongoose.connection.close();
        process.exit();
    }
};

updateEnrollmentsByColid();
