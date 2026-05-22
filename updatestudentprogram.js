const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./Models/user');

dotenv.config({ path: './config.env' });

async function updateStudents() {
    try {
        await mongoose.connect(process.env.DATABASE2);
        console.log('Database connected');

        const students = await User.find({ colid: 3098, role: 'Student' });
        console.log(`Found ${students.length} students`);

        let updated = 0;

        for (const student of students) {
            // student.program = student.Major || '';
            // student.Minor = student.Major || '';

            const semester = Number(student.semester);
            if (semester && semester % 2 === 0) {
                student.semester = String(semester - 1);
            }

            await student.save();
            updated++;
        }

        console.log(`Updated ${updated} students`);
    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.connection.close();
        console.log('Database closed');
    }
}

updateStudents();
