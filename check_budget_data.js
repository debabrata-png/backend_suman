const mongoose = require('mongoose');
const dotenv = require('dotenv');
const budgetpocatds = require('./Models/budgetpocatds');
const budgetpods = require('./Models/budgetpods');

dotenv.config({ path: './config.env' });
const DB = process.env.DATABASE2 || process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);

async function checkData() {
    try {
        await mongoose.connect(DB);
        const categories = await budgetpocatds.find({ category: 'Electrical Items' });
        console.log('Categories found:', JSON.stringify(categories, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
checkData();
