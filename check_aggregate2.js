const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './config.env' });
const StudentMarks9ds = require('./Models/studentmarks9ds.js');

mongoose.connect(process.env.DATABASE2, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    const existingMarks = await StudentMarks9ds.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId('69b262fffe50540997fb0e8d')
        }
      },
      {
        $project: {
          subjectcode: 1,
          isabsent_old: '$isabsent',
          isabsent_new: '$term1periodictestabsent',
          isabsent: { $ifNull: ['$term1periodictestabsent', false] }
        }
      }
    ]);
    console.log(existingMarks);
    mongoose.connection.close();
  });
