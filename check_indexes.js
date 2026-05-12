const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './config.env' });

const db = process.env.DATABASE.replace(
    '<PASSWORD>',
    process.env.DATABASE_PASSWORD
);

mongoose.connect(db).then(async () => {
    console.log('DB connection successful!');
    const collections = await mongoose.connection.db.listCollections().toArray();
    const challanConfigs = collections.find(c => c.name === 'challanconfigs');
    
    if (challanConfigs) {
        const indexes = await mongoose.connection.db.collection('challanconfigs').indexes();
        console.log('Indexes for challanconfigs:');
        console.log(JSON.stringify(indexes, null, 2));
    } else {
        console.log('Collection challanconfigs not found');
    }
    process.exit();
}).catch(err => {
    console.error('DB Connection Error:', err);
    process.exit(1);
});
