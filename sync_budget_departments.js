const mongoose = require('mongoose');
const dotenv = require('dotenv');
const budgetpocatds = require('./Models/budgetpocatds');
const budgetpods = require('./Models/budgetpods');

dotenv.config({ path: './config.env' });

const DB = process.env.DATABASE2 || process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);

async function syncDepartments() {
    try {
        await mongoose.connect(DB);
        console.log('Connected to database for repair...');

        // 1. Get all categories
        const categories = await budgetpocatds.find({});
        console.log(`Found ${categories.length} budget categories to check.`);

        let updatedCount = 0;

        for (const cat of categories) {
            if (!cat.department) {
                // Find parent budget
                const parent = await budgetpods.findById(cat.budgetid);
                if (parent && parent.department) {
                    await budgetpocatds.findByIdAndUpdate(cat._id, { department: parent.department });
                    updatedCount++;
                    console.log(`Updated category "${cat.category}" (Budget: ${cat.budgetname}) with department: ${parent.department}`);
                } else {
                    console.warn(`Could not find department for category "${cat.category}" (Budget: ${cat.budgetname})`);
                }
            }
        }

        console.log(`Successfully updated ${updatedCount} categories.`);
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

syncDepartments();
