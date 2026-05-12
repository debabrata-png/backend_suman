const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './config.env' });
const StudentMarks11ds = require('./Models/studentmarks11ds.js');

mongoose.connect('mongodb://localhost:27017/DB2', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    const marks = await StudentMarks11ds.find({ semester: 'XI', section: 'HUMANITIES' }).limit(5);
    console.log("Found ANY Class 11 Marks Locally:", marks.length);
    mongoose.connection.close();
  });
