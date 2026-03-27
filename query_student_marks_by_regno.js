const mongoose = require('mongoose');
const StudentMarks9ds = require('./Models/studentmarks9ds.js');

// Configuration
const MONGO_URI = 'mongodb+srv://user3:Hello123456@cluster0.bhzac.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const QUERY = {
    regno: '1053/2014', // Replace with desired regno
    semester: 'IX',      // Replace with desired semester
    colid: 3052         // Replace with desired colid
};

async function queryMarks() {
    try {
        await mongoose.connect(MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log("Connected to MongoDB");

        console.log("Querying marks for:", QUERY);
        const marks = await StudentMarks9ds.find(QUERY);

        console.log(`Found ${marks.length} records:`);
        console.log(JSON.stringify(marks, null, 2));

    } catch (error) {
        console.error("Error querying marks:", error);
    } finally {
        await mongoose.connection.close();
        console.log("Disconnected from MongoDB");
    }
}

queryMarks();
