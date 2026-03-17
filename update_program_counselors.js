const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const xlsx = require('xlsx');
const ProgramCounselords = require('./Models/ProgramCounselords.js');

dotenv.config({ path: './config.env' });

const db = "mongodb+srv://user3:Hello123456@cluster0.bhzac.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"

mongoose.connect(db).then(() => console.log('DB connection successful!'));

const updateData = async () => {
  try {
    const filePath = path.join(__dirname, 'programcounselords.csv');
    if (!fs.existsSync(filePath)) {
      console.error('File not found:', filePath);
      process.exit(1);
    }

    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    console.log(`Read ${data.length} rows from CSV.`);

    let updatedCount = 0;
    let notFoundCount = 0;

    for (const row of data) {
      const programCode = row['Program Code'];
      const programType = row['Program Type'];
      const colid = 6050;

      if (!programCode || !programType) {
        continue;
      }

      const updatedRecord = await ProgramCounselords.findOneAndUpdate(
        {
          course_code: String(programCode).trim(),
          program_type: String(programType).trim(),
          colid: colid
        },
        {
          category: row['Category'],
          education_qualification: row['Qualification'],
          counsellor_name: row['Counselor Name'],
          counsellor_email: row['Counselor Email'],
          institution: row['Institution']
        },
        { new: true }
      );

      if (updatedRecord) {
        updatedCount++;
      } else {
        notFoundCount++;
        console.log(`Not Found: ${programCode} (${programType}) for colid ${colid}`);
      }
    }

    console.log(`Update complete. Updated: ${updatedCount}, Not Found: ${notFoundCount}`);
    process.exit();
  } catch (err) {
    console.error('Error during update:', err);
    process.exit(1);
  }
};

updateData();
