const mongoose = require('mongoose');
const User = require('./Models/user');

const MONGODB_URI = "mongodb+srv://user3:Hello123456@cluster0.bhzac.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const emailsToDelete = [
    "arzoonoshi@gmail.com",
    "prachisharma6257258@gmail.com"
    
];

const deleteConflicts = async () => {
    try {
        await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log("✅ MongoDB connected");

        const result = await User.deleteMany({ email: { $in: emailsToDelete } });

        console.log(`✅ Successfully deleted ${result.deletedCount} users.`);

    } catch (err) {
        console.error("❌ Error deleting users:", err);
    } finally {
        mongoose.connection.close();
        process.exit();
    }
};

deleteConflicts();
