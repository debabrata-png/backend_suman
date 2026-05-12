const mongoose = require('mongoose');
const dotenv = require('dotenv');
const crmh1 = require('./Models/crmh1');

// Load environment variables
dotenv.config({ path: './config.env' });

const DB_URL = process.env.DATABASE2;
const DRY_RUN = process.env.DRY_RUN !== 'false'; // Default to true unless explicitly false

if (!DB_URL) {
    console.error('Error: DATABASE2 environment variable is not defined in config.env');
    process.exit(1);
}

async function deleteCrmData() {
    try {
        console.log("Connecting to database...");
        await mongoose.connect(DB_URL);
        console.log('MongoDB successfully connected.');

        // Generate array of names from "1" to "1000"
        const nameArray = Array.from({ length: 1000 }, (_, i) => (i + 1).toString());

        const query = {
            colid: 6050,
            name: { $in: nameArray }
        };

        const count = await crmh1.countDocuments(query);
        console.log(`\nFound ${count} records matching the criteria (colid: 6050, name: "1"-"1000").`);

        if (count === 0) {
            console.log("No records found to delete. Exiting.");
        } else if (DRY_RUN) {
            console.log("\n[DRY RUN] No records were deleted. To proceed with the deletion, run with DRY_RUN=false.");
        } else {
            console.log("\n[LIVE MODE] Proceeding with deletion...");
            const result = await crmh1.deleteMany(query);
            console.log(`Successfully deleted ${result.deletedCount} records.`);
        }

    } catch (e) {
        console.error("Fatal Error:", e);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

deleteCrmData();
