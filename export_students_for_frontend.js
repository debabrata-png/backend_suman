const mongoose = require('mongoose');
const fs = require('fs');
const User = require('./Models/user');
require('dotenv').config({ path: './config.env' });

const DB_URL = process.env.DATABASE2 || "mongodb+srv://user3:Hello123456@cluster0.bhzac.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

async function exportStudents() {
    try {
        await mongoose.connect(DB_URL);
        console.log('Connected to MongoDB');

        const colid = 3052;
        const students = await User.find({
            colid: colid,
            role: 'Student'
        }).select('name regno rollno semester').lean();

        // Group by semester (Class)
        const grouped = {};
        students.forEach(s => {
            const sem = s.semester || 'Unknown';
            if (!grouped[sem]) grouped[sem] = [];
            grouped[sem].push({
                name: s.name,
                regno: s.regno,
                rollno: s.rollno || '-'
            });
        });

        fs.writeFileSync('students_classwise.json', JSON.stringify(grouped, null, 2));
        console.log(`Exported ${students.length} students to students_classwise.json`);
        process.exit(0);
    } catch (error) {
        console.error('Export failed:', error);
        process.exit(1);
    }
}

exportStudents();
