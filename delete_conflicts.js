const mongoose = require('mongoose');
const User = require('./Models/user');

const MONGODB_URI = "mongodb+srv://user3:Hello123456@cluster0.bhzac.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const emailsToDelete = [
    "shivanisingh2042@gmail.com",
    "latarai101@gmail.com",
    "abinajoys@gmail.com",
    "satlyshaju0@gmail.com",
    "simmuanand21@gmail.com",
    "thakurriyasingh261997@gmail.com",
    "dr.dpnagar2288@gmail.com",
    "manish120388@gmail.com",
    "archananandmer@gmail.com",
    "pooja.meenar15@gmail.com",
    "manishasahu517@gmail.com",
    "richajain.csrd@peoplesuniversity.edu.in",
    "abin.csrd@peoplesuniversity.edu.in",
    "hellovarti81@gmail.com",
    "chefajeetphadke@gmail.com",
    "astha29.s@gmail.com",
    "nazia.leo@gmail.com"
];

const deleteConflicts = async () => {
    try {
        await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log("✅ MongoDB connected");

        console.log(`Attempting to delete ${emailsToDelete.length} conflicting users...`);

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
