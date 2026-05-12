const mongoose = require("mongoose");
const User = require("./Models/user");

const DB_URI = "mongodb+srv://user3:Hello123456@cluster0.bhzac.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const updateStudentData = async () => {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(DB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log("Connected to MongoDB successfully.");

        const filter = {
            role: "Student",
            colid: 5050,
            programcode: "BTECH CSE",
            academicyear: "2026-27",
            semester: "2"
        };

        const update = {
            $set: {
                Major: "Computer Science"
            }
        };

        console.log("Filter criteria:", JSON.stringify(filter, null, 2));
        
        // First, count the matching documents
        const count = await User.countDocuments(filter);
        console.log(`Found ${count} students matching the criteria.`);

        if (count > 0) {
            const result = await User.updateMany(filter, update);
            console.log(`Update result:`);
            console.log(`- Matched count: ${result.matchedCount}`);
            console.log(`- Modified count: ${result.modifiedCount}`);
            console.log("Students data updated successfully.");
        } else {
            console.log("No students found matching the criteria. No updates performed.");
        }

    } catch (error) {
        console.error("An error occurred while updating student data:", error);
    } finally {
        await mongoose.connection.close();
        console.log("MongoDB connection closed.");
        process.exit(0);
    }
};

updateStudentData();
