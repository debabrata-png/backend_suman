const mongoose = require('mongoose');
const Classenr1 = require('./Models/classenr1');

const MONGODB_URI = "mongodb+srv://user3:Hello123456@cluster0.bhzac.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const countData = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        const count = await Classenr1.countDocuments();
        console.log(`Total records in Classenr1: ${count}`);
    } catch (err) {
        console.error("Error connecting/counting:", err);
    } finally {
        mongoose.connection.close();
        process.exit();
    }
};

countData();
