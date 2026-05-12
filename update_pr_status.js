const mongoose = require("mongoose");
const StoreReq1 = require("./Models/storerequisationds");
const StoreReq2 = require("./Models/storerequisationds2");

const connectDB = async () => {
    try {
        // Using the connection string found in empdbchangecolid.js
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

const updateStatus = async () => {
    await connectDB();
    try {
        const prNumbers = ["PRCSPU-202605-036"];
        const colid = 3090;
        const oldStatus = "Completed";
        const newStatus = "Assigned";

        console.log(`Updating status from '${oldStatus}' to '${newStatus}' for PR numbers: ${prNumbers.join(", ")} with colid: ${colid}`);

        // Update in storerequisationds2 (Model 2)
        const result2 = await StoreReq2.updateMany(
            {
                colid: colid,
                prnumber: { $in: prNumbers },
                reqstatus: oldStatus
            },
            {
                $set: { reqstatus: newStatus }
            }
        );
        console.log(`Model 2 (storerequisationds2): Matched ${result2.matchedCount}, Updated ${result2.modifiedCount}`);

        console.log("\nUpdate Process Completed.");

    } catch (err) {
        console.error("Error during update:", err);
    } finally {
        mongoose.connection.close();
        console.log("MongoDB connection closed.");
    }
}

updateStatus();
