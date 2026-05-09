const mongoose = require('mongoose');
const pgmasterds = require('./Models/pgmasterds');

const MONGO_URI = "mongodb://89.192.159.162:27017/backend_suman"; // Using the IP from previous error logs if local fails

async function seedOmniware() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB");

        const colid = 30; // Assuming college ID 30 as per previous context

        const omniwarePG = {
            name: "Omniware Gateway",
            user: "admin",
            colid: colid,
            gatwayname: "Omniware",
            accountno: "OMN_ACC_01",
            accountname: "Omniware Primary",
            api: "/api/v2/omniwaregatewayds/initiate",
            isactive: true,
            environment: "UAT"
        };

        const existing = await pgmasterds.findOne({ colid, gatwayname: "Omniware" });
        if (existing) {
            console.log("Omniware PG already exists in pgmasterds");
        } else {
            await pgmasterds.create(omniwarePG);
            console.log("Omniware PG seeded into pgmasterds successfully");
        }

        process.exit(0);
    } catch (err) {
        console.error("Error seeding Omniware PG:", err);
        process.exit(1);
    }
}

seedOmniware();
