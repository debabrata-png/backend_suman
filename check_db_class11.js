const mongoose = require('mongoose');
const SubjectComponentConfig11ds = require('./Models/subjectcomponentconfig11ds');
// Using the local DB that backend connects to, or check check_db2.js to see connection string.
// Let's require app or grab the conn string.
const dbStr = "mongodb+srv://Suman:BvnnFExItv5VwZtF@cluster0.dbvvw3f.mongodb.net/test?retryWrites=true&w=majority";

mongoose.connect(dbStr, { useNewUrlParser: true, useUnifiedTopology: true })
.then(async () => {
    console.log("Connected to DB");
    const subjects = await SubjectComponentConfig11ds.find({});
    console.log("All subjects count:", subjects.length);
    if(subjects.length > 0) {
        console.log("First subject:", subjects[0]);
    }
    const sem11 = await SubjectComponentConfig11ds.find({ semester: '11' });
    console.log("Semester 11 subjects:", sem11.length);
    process.exit(0);
})
.catch(err => {
    console.error(err);
    process.exit(1);
});
