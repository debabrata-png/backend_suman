const mongoose = require('mongoose');
const StudentMarks9ds = require('./Models/studentmarks9ds.js');

mongoose.connect('mongodb://localhost:27017/DB2', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log("Connected to DB");
    const marks = await StudentMarks9ds.find({ term1periodictestabsent: true });
    console.log("Marks with absent true:", marks.length);
    if(marks.length > 0) {
      console.log("Example:", marks[0]);
    }
    const anyMarks = await StudentMarks9ds.find({ regno: '1844/2022', subjectcode: 'E' }); // English
    console.log("English mark for Rishita:", anyMarks[0]);
    mongoose.connection.close();
  });
