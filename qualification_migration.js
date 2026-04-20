const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// 1. Load environment variables from config.env
dotenv.config({ path: './config.env' });

// 2. Import Models
const Category = require('./Models/categoryag1');
const ProgramCounselor = require('./Models/ProgramCounselords');

const DB = process.env.DATABASE2;

const connectDB = async () => {
    try {
        if (!DB) throw new Error("DATABASE2 not found in config.env");
        await mongoose.connect(DB);
        console.log('✓ MongoDB Connected');
        await runUpdate();
    } catch (err) {
        console.error('✗ Connection Error:', err.message);
        process.exit(1);
    }
};

const runUpdate = async () => {
    const targetColid = 6050;
    const prefix = "After ";

    try {
        console.log(`Starting update for colid: ${targetColid}...`);

        // --- Update Category Management (categoryag1) ---
        const categories = await Category.find({ colid: targetColid });
        let catCount = 0;
        
        console.log(`Processing ${categories.length} Category records...`);
        for (let cat of categories) {
            if (cat.education_qualification && !cat.education_qualification.startsWith(prefix)) {
                cat.education_qualification = prefix + cat.education_qualification;
                await cat.save();
                catCount++;
            }
        }
        console.log(`✓ Successfully updated ${catCount} records in Category Management.`);

        // --- Update Program Counselor (ProgramCounselords) ---
        const counselors = await ProgramCounselor.find({ colid: targetColid });
        let pcCount = 0;

        console.log(`Processing ${counselors.length} Program Counselor records...`);
        for (let pc of counselors) {
            if (pc.education_qualification && !pc.education_qualification.startsWith(prefix)) {
                pc.education_qualification = prefix + pc.education_qualification;
                await pc.save();
                pcCount++;
            }
        }
        console.log(`✓ Successfully updated ${pcCount} records in Program Counselor.`);

        console.log('Migration Complete.');
        process.exit(0);
    } catch (err) {
        console.error('✗ Update Error:', err);
        process.exit(1);
    }
};

connectDB();
