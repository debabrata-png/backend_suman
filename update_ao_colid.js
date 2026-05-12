const mongoose = require('mongoose');
const User = require('./Models/user');
const dotenv = require('dotenv');
dotenv.config({ path: './config.env' });

const DB = process.env.DATABASE2;

// The list of colids you provided
const oldColids = [9050]
//const oldColids = [3098, 3091, 3092, 3094, 4000, 3098, 3096, 4004, 4008, 4010, 4012, 4014];
const targetColid = 3090; // Target colid for JG University

async function updateAOColids() {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(DB);
        console.log('DB connection successful!');

        console.log(`Updating colid for AO users from [${oldColids.join(', ')}] to ${targetColid}...`);

        const result = await User.updateMany(
            {
                role: 'AO',
                colid: { $in: oldColids }
            },
            { $set: { colid: targetColid } }
        );

        console.log('----------------------------------------');
        console.log(`Update Complete!`);
        console.log(`Matched Users: ${result.matchedCount}`);
        console.log(`Modified Users: ${result.modifiedCount}`);
        console.log('----------------------------------------');

        mongoose.connection.close();
    } catch (err) {
        console.error('Error updating AO colids:', err);
        if (mongoose.connection) mongoose.connection.close();
    }
}

updateAOColids();
