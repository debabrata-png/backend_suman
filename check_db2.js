const mongoose = require('mongoose');
const StudentMarks9ds = require('./Models/studentmarks9ds.js');

mongoose.connect('mongodb://localhost:27017/DB2', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log("Connected to DB");
    const anyMark = await StudentMarks9ds.findOne();
    console.log("Any mark:", anyMark);
    mongoose.connection.close();
  });
