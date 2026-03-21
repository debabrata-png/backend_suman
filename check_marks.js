const mongoose = require('mongoose');
const StudentMarks11ds = require('./Models/studentmarks11ds');

mongoose.connect("mongodb+srv://Suman:BvnnFExItv5VwZtF@cluster0.dbvvw3f.mongodb.net/test?retryWrites=true&w=majority", { useNewUrlParser: true, useUnifiedTopology: true })
.then(async () => {
    console.log("Connected to DB");
    const marks = await StudentMarks11ds.find({ colid: 3052 });
    console.log("Total class 11 marks records for colid 3052:", marks.length);
    if(marks.length > 0) {
        console.log("Sample mark:\n", marks[0]);
    }

    const marksXI = await StudentMarks11ds.find({ colid: 3052, semester: 'XI' });
    console.log("Total class 11 marks records for colid 3052 and semester XI:", marksXI.length);

    process.exit(0);
})
.catch(err => {
    console.error(err);
    process.exit(1);
});
