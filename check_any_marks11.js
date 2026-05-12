const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './config.env' });
const StudentMarks11ds = require('./Models/studentmarks11ds.js');

mongoose.connect(process.env.DATABASE2, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    // Just find ANY Class 11 marks for Suman's school
    const marks = await StudentMarks11ds.find({ colid: 3052 }).limit(3);
    console.log(`Found ${marks.length} marks for school 3052`);
    if(marks.length > 0) {
      console.log("Sample:", JSON.stringify(marks[0], null, 2));
    }
    mongoose.connection.close();
  });
