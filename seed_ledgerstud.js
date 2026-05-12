const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Ledgerstud = require('./Models/ledgerstud');

// Load environment variables
dotenv.config({ path: './config.env' });

// Use DB URL from DATABASE2 in config.env as requested
const DB = process.env.DATABASE2;

if (!DB) {
    console.error('DATABASE2 not found in config.env!');
    process.exit(1);
}

mongoose.connect(DB).then(async () => {
    console.log('Connected to DB successfully!');

    const dummyData = [];
    // Generate 35 dummy records (within 30-40 range)
    for (let i = 1; i <= 35; i++) {
        dummyData.push({
            name: `Dummy Student`,
            user: `localdemo@campus.technology`,
            feegroup: `General Fees`,
            regno: `REG-${2026000 + i}`,
            student: `stu_id_${i}`,
            feeitem: `Tuition Fee`,
            amount: Math.floor(Math.random() * 5000) + 1000,
            feebook: `FB-1`,
            feecounter: `Counter 1`,
            paymode: `Cash`,
            paydetails: `Paid at counter`,
            feecategory: `Regular`,
            semester: `1`,
            cashbook: `CB-1`,
            institution: `Institute 1`,
            type: `Credit`,
            installment: `1`,
            comments: `Dummy payment record`,
            academicyear: `2025-2026`,
            colid: 1,
            classdate: new Date(),
            status: `Paid`,
            programcode: `CSE`,
            admissionyear: `2025-2026`
        });
    }

    try {
        await Ledgerstud.insertMany(dummyData);
        console.log(`Successfully inserted ${dummyData.length} records into ledgerstud with colid: 1.`);
    } catch (err) {
        console.error('Error inserting dummy data:', err);
    } finally {
        mongoose.disconnect();
    }
}).catch(err => {
    console.error('Database connection error:', err);
});
