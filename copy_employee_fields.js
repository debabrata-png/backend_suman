const mongoose = require("mongoose");
const EmployeeField = require("./Models/employeedatabasefieldds");

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

const copyFields = async () => {
    await connectDB();
    try {
        const sourceColid = 3090;
        const targetColids = [3098, 3091, 3092, 3094, 4000, 3096, 4004, 4008, 4010, 4012, 4014];

        console.log(`Fetching source data from colid: ${sourceColid}`);
        const sourceData = await EmployeeField.find({ colid: sourceColid }).lean();

        if (sourceData.length === 0) {
            console.log("No data found for source colid 3090. Exiting.");
            return;
        }

        console.log(`Found ${sourceData.length} fields to copy.`);

        for (const targetColid of targetColids) {
            console.log(`\nProcessing target colid: ${targetColid}`);
            let successCount = 0;
            let errorCount = 0;

            for (const item of sourceData) {
                // Remove _id and timestamps to create a fresh copy
                const { _id, createdAt, updatedAt, colid, ...rest } = item;
                
                try {
                    // Use upsert to avoid duplicate key errors and update existing ones if they differ
                    await EmployeeField.updateOne(
                        { colid: targetColid, fieldname: rest.fieldname },
                        { $set: { ...rest, colid: targetColid } },
                        { upsert: true }
                    );
                    successCount++;
                } catch (err) {
                    console.error(`Error copying field ${rest.fieldname} to colid ${targetColid}:`, err.message);
                    errorCount++;
                }
            }
            console.log(`Finished colid ${targetColid}: ${successCount} upserted, ${errorCount} errors.`);
        }

        console.log("\nAll copies completed.");

    } catch (err) {
        console.error("Critical error during process:", err);
    } finally {
        mongoose.connection.close();
        console.log("MongoDB connection closed.");
    }
}

copyFields();
