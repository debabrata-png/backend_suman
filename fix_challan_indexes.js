const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './config.env' });

const db = process.env.DATABASE.replace(
    '<PASSWORD>',
    process.env.DATABASE_PASSWORD
);

mongoose.connect(db).then(async () => {
    console.log('DB connection successful!');
    
    try {
        const collection = mongoose.connection.db.collection('challanconfigs');
        
        // Drop the faulty unique index on colid
        try {
            await collection.dropIndex('colid_1');
            console.log('Dropped unique index: colid_1');
        } catch (e) {
            console.log('Index colid_1 not found or already dropped');
        }

        // Create the correct compound unique index
        await collection.createIndex({ colid: 1, configName: 1 }, { unique: true });
        console.log('Created compound unique index: { colid: 1, configName: 1 }');
        
    } catch (err) {
        console.error('Migration Error:', err);
    }
    
    process.exit();
}).catch(err => {
    console.error('DB Connection Error:', err);
    process.exit(1);
});
