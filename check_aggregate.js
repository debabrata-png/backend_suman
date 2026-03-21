const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './config.env' });
const StudentMarks9ds = require('./Models/studentmarks9ds.js');

mongoose.connect(process.env.DATABASE2, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log("Connected to DB2");
    
    // Run the aggregation pipeline
    const componentname = 'term1periodictest';
    const existingMarks = await StudentMarks9ds.aggregate([
      {
        $match: {
          colid: 3052,
          semester: 'I',
          academicyear: '2025-26',
          regno: '1844/2022'
        }
      },
      {
        $project: {
          regno: 1,
          subjectcode: 1,
          obtainedmarks: `$${componentname}obtained`,
          term1total: 1,
          term2total: 1,
          isgrace: 1,
          isabsent: `$${componentname}absent`,
          status: 1
        }
      }
    ]);
    
    console.log("Aggregated marks:", existingMarks);
    
    mongoose.connection.close();
  }).catch(err => {
    console.error(err);
  });
