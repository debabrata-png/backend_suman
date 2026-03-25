const mongoose = require('mongoose');
const grnds2 = require('./Models/grnds2');
const dotenv = require('dotenv');
dotenv.config({ path: './config.env' });

const dbURI = process.env.DATABASE2;
mongoose.connect(dbURI).then(async () => {
    const grns = await grnds2.find({}).limit(5);
    console.log(JSON.stringify(grns, null, 2));
    process.exit(0);
});
