const mongoose = require("mongoose");
const StoreReq1 = require("./Models/storerequisationds");
const StoreReq2 = require("./Models/storerequisationds2");

const connectDB = async () => {
    try {
        await mongoose.connect("mongodb+srv://user3:Hello123456@cluster0.bhzac.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0", {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log("MongoDB connected");
    } catch (err) {
        console.error("MongoDB connection error:", err);
        process.exit(1);
    }
}

const checkStatus = async () => {
    await connectDB();
    try {
        const prNumbers = ["PRCSPU-202605-008", "PRCSPU-202603-001"];
        const colid = 3090;

        console.log(`Checking status for PR numbers: ${prNumbers.join(", ")} with colid: ${colid}`);

        const count1 = await StoreReq1.countDocuments({
            colid: colid,
            prnumber: { $in: prNumbers },
            reqstatus: "Completed"
        });
        console.log(`Found ${count1} matching records in storerequisationds (model 1)`);

        const count2 = await StoreReq2.countDocuments({
            colid: colid,
            prnumber: { $in: prNumbers },
            reqstatus: "Completed"
        });
        console.log(`Found ${count2} matching records in storerequisationds2 (model 2)`);

        if (count1 > 0) {
            const records1 = await StoreReq1.find({ colid: colid, prnumber: { $in: prNumbers } });
            console.log("\nRecords in Model 1:");
            records1.forEach(r => console.log(`PR: ${r.prnumber}, Status: ${r.reqstatus}`));
        }

        if (count2 > 0) {
            const records2 = await StoreReq2.find({ colid: colid, prnumber: { $in: prNumbers } });
            console.log("\nRecords in Model 2:");
            records2.forEach(r => console.log(`PR: ${r.prnumber}, Status: ${r.reqstatus}`));
        }

    } catch (err) {
        console.error("Error:", err);
    } finally {
        mongoose.connection.close();
        console.log("MongoDB connection closed.");
    }
}

checkStatus();
