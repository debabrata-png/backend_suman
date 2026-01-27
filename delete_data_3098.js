const mongoose = require('mongoose');
const Classenr1 = require('./Models/classenr1');
const MfacCourses = require('./Models/mfaccourses');
const mfaccourses = require('./Models/mfaccourses');
const User = require('./Models/user');

const MONGODB_URI = "mongodb+srv://user3:Hello123456@cluster0.bhzac.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const connectDB = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("✅ MongoDB connected");
    } catch (err) {
        console.error("❌ MongoDB connection error:", err);
        process.exit(1);
    }
};

const deleteData = async () => {
    await connectDB();

    try {
        const colidToDelete = 4004;

        console.log(`Deleting data for colid: ${colidToDelete}...`);

        // 1. Delete from Classenr1
        const res1 = await Classenr1.deleteMany({ colid: colidToDelete });
        console.log(`Deleted ${res1.deletedCount} records from Classenr1.`);

        // // 2. Delete from MfacCourses
        // const res2 = await MfacCourses.deleteMany({ colid: colidToDelete });
        // console.log(`Deleted ${res2.deletedCount} records from MfacCourses.`);

        // const res3 = await User.deleteMany({ colid: colidToDelete, role: 'Student' });
        // console.log(`Deleted ${res3.deletedCount} records from User.`);

    } catch (err) {
        console.error("❌ Error deleting data:", err);
    } finally {
        mongoose.connection.close();
        process.exit();
    }
};

deleteData();
