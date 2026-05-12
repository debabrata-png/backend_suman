const mongoose = require('mongoose');
const User = require('./Models/user');

const MONGODB_URI = "mongodb+srv://user3:Hello123456@cluster0.bhzac.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const COLID = 3098;

const connectDB = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("✅ MongoDB connected");
    } catch (err) {
        console.error("❌ MongoDB connection error:", err);
        process.exit(1);
    }
};

const verifyStudents = async () => {
    await connectDB();

    try {
        console.log(`Searching for students with colid: ${COLID}...`);
        const students = await User.find({ colid: COLID, role: 'Student' });

        const count = students.length;
        console.log(`\n### TOTAL STUDENTS FOUND FOR COLID ${COLID}: ${count} ###\n`);

        console.log(`First 20 students:`);
        students.slice(0, 20).forEach((student, index) => {
            console.log(`${index + 1}. ${student.name} (${student.email}) - Reg: ${student.regno}`);
        });

        if (count > 20) {
            console.log(`... and ${count - 20} more.`);
        }

    } catch (err) {
        console.error("❌ Error verifying data:", err);
    } finally {
        mongoose.connection.close();
        process.exit();
    }
};

verifyStudents();
