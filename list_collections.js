const mongoose = require('mongoose');

async function check() {
    await mongoose.connect('mongodb://localhost:27017/ep3');
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(collections.map(c => c.name));
    process.exit();
}
check();
