const mongoose = require('mongoose');
const User = require('./Models/user');

// Using the same connection string found in your other scripts
const MONGODB_URI = "mongodb+srv://user3:Hello123456@cluster0.bhzac.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const updatePhotos = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("✅ MongoDB connected");

        console.log("Fetching all users with role 'Student' and colid '3052'...");
        
        // Find all students with colid 3052
        const students = await User.find({ role: 'Student', colid: 3052 }, { _id: 1, rollno: 1, name: 1, regno: 1 });
        
        console.log(`Found ${students.length} students. Preparing updates...`);

        let missingRollNoCount = 0;
        let updateCount = 0;

        // We use bulkWrite so it's fast and executes in batches
        const bulkOps = [];

        students.forEach((student) => {
            // We can only use the rollno if it exists
            if (student.rollno && student.rollno.toString().trim() !== '') {
                const cleanRollNo = student.rollno.toString().trim();
                const encodedRollNo = encodeURIComponent(cleanRollNo);
                const photoUrl = `https://careerpublicschool.ac.in/campus-technology/${encodedRollNo}.jpg`;
                
                bulkOps.push({
                    updateOne: {
                        filter: { _id: student._id },
                        update: { $set: { photo: photoUrl } }
                    }
                });
                updateCount++;
            } else {
                missingRollNoCount++;
            }
        });

        if (bulkOps.length > 0) {
            console.log(`Executing bulk update for ${bulkOps.length} student records...`);
            const result = await User.bulkWrite(bulkOps);
            console.log(`✅ Successfully updated ${result.modifiedCount} student photos.`);
        } else {
            console.log("No students with valid roll numbers found to update.");
        }

        if (missingRollNoCount > 0) {
            console.log(`⚠️ Skipped ${missingRollNoCount} students because they do not have a valid 'rollno' in the database.`);
        }

    } catch (err) {
        console.error("❌ MongoDB operation error:", err);
    } finally {
        await mongoose.connection.close();
        console.log("🔒 MongoDB connection closed.");
        process.exit(0);
    }
};

updatePhotos();
