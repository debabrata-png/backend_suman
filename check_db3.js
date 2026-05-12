const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './config.env' });
const StudentMarks9ds = require('./Models/studentmarks9ds.js');

mongoose.connect(process.env.DATABASE2, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log("Connected to DB2");
    
    // Look up mark for Rishita
    const rishitaMarks = await StudentMarks9ds.find({ regno: '1844/2022' });
    console.log("Found marks:", rishitaMarks.length);
    if (rishitaMarks.length > 0) {
      console.log("Example:", rishitaMarks[0]);
    }
    
    mongoose.connection.close();
  }).catch(err => {
    console.error(err);
  });
