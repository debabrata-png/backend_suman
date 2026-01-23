const mongoose = require('mongoose');
const User = require('./Models/user');

const MONGODB_URI = "mongodb+srv://user3:Hello123456@cluster0.bhzac.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const countUsers = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        const count = await User.countDocuments({
            colid: 3098,
            role: "Student"
        });
        console.log(`Total records in User collection: ${count}`);
    } catch (err) {
        console.error("Error connecting/counting:", err);
    } finally {
        mongoose.connection.close();
        process.exit();
    }
};

countUsers();
