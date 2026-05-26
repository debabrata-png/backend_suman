const mongoose = require('mongoose');
const dotenv = require('dotenv');
const neplmstimetableds = require('./Models/neplmstimetableds');
const workloadassignmentds = require('./Models/workloadassignmentds');

dotenv.config({ path: './config.env' });

async function updateFacultyEmail() {
    try {
        await mongoose.connect(process.env.DATABASE2);
        console.log('Database connected');

        const filter = {
            colid: 5050,
            facultyemail: 'Himanshi.josshi@cdgi.edu.in'
        };

        const update = {
            $set: {
                facultyemail: 'himanshi.joshi@cdgi.edu.in'
            }
        };

        const timetableResult = await neplmstimetableds.updateMany(filter, update);
        const workloadResult = await workloadassignmentds.updateMany(filter, update);

        console.log(`Timetable matched: ${timetableResult.matchedCount}, updated: ${timetableResult.modifiedCount}`);
        console.log(`Workload matched: ${workloadResult.matchedCount}, updated: ${workloadResult.modifiedCount}`);
    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.connection.close();
        console.log('Database closed');
    }
}

updateFacultyEmail();
