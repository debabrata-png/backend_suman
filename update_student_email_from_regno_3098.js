const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./Models/user');

dotenv.config({ path: './config.env' });

async function updateStudentEmails() {
    try {
        await mongoose.connect(process.env.DATABASE2);
        console.log('Database connected');

        const students = await User.find({ colid: 3098, role: 'Student' });
        console.log(`Found ${students.length} students`);

        let updated = 0;
        let skipped = 0;
        let duplicate = 0;

        for (const student of students) {
            const regno = student.regno ? student.regno.toString().trim() : '';

            if (!regno || regno.toUpperCase() === 'NA') {
                skipped++;
                continue;
            }

            const newEmail = regno.toLowerCase();
            const emailExists = await User.findOne({ email: newEmail, _id: { $ne: student._id } });

            if (emailExists) {
                duplicate++;
                console.log(`Duplicate skipped: ${newEmail}`);
                continue;
            }

            try {
                student.email = newEmail;
                await student.save();
                updated++;
            } catch (error) {
                skipped++;
                console.log(`Skipped ${newEmail}: ${error.message}`);
            }
        }

        console.log(`Updated ${updated} student emails`);
        console.log(`Skipped ${skipped} students without regno`);
        console.log(`Skipped ${duplicate} duplicate emails`);
    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.connection.close();
        console.log('Database closed');
    }
}

updateStudentEmails();
