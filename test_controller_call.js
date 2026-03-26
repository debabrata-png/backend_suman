const mongoose = require('mongoose');
const dotenv = require('dotenv');
const studentmarks9ctlrds = require('./controllers/studentmarks9ctlrds');

dotenv.config({ path: './config.env' });
const DB_URL = process.env.DATABASE2 || "mongodb+srv://user3:Hello123456@cluster0.bhzac.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

async function testController() {
    try {
        await mongoose.connect(DB_URL);
        console.log('MongoDB connected.');

        const req = {
            query: {
                colid: 3052,
                regno: '1614/2019',
                semester: 'VII',
                academicyear: '2025-26'
            }
        };

        const res = {
            json: function(response) {
                console.log('Controller returned success:', response.success);
                const data = response.data;
                if (data) {
                    console.log('Student:', data.profile.name);
                    console.log('Percentage:', data.percentage);
                    console.log('Overall Grade:', data.overallGrade);
                    console.log('Rank:', data.rank);
                }
                process.exit(0);
            },
            status: function(code) {
                console.log('Status code:', code);
                return this;
            }
        };

        await studentmarks9ctlrds.getmarksheetpdfdata9ds(req, res);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

testController();
