const mongoose = require('mongoose');
const storemasterds2 = require('./Models/storemasterds2');
const dotenv = require('dotenv');
dotenv.config({ path: './config.env' });

const dbURI = process.env.DATABASE2;
mongoose.connect(dbURI).then(async () => {
    const stores = await storemasterds2.find({});
    console.log(JSON.stringify(stores, null, 2));
    process.exit(0);
});
