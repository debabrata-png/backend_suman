const mongoose = require("mongoose");
const xlsx = require("xlsx");
const Employee = require("./Models/employeedatabaseds");

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

const updateColIds = async () => {
    await connectDB();
    try {
        // Load the excel/csv file
        const workbook = xlsx.readFile("employee_database.csv");
        const sheetName = workbook.SheetNames[0];
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        console.log(`Found ${data.length} records in the file.`);

        let successCount = 0;
        let failCount = 0;

        for (const row of data) {
            const email = row.Email;
            const colid = row.colid;

            if (email && colid !== undefined) {
                try {
                    const result = await Employee.updateMany(
                        { email: email.trim() },
                        { $set: { colid: Number(colid) } }
                    );

                    if (result.matchedCount > 0) {
                        console.log(`Updated ${email} to colid ${colid} (Matched: ${result.matchedCount})`);
                        successCount++;
                    } else {
                        console.log(`No record found for email: ${email}`);
                        failCount++;
                    }
                } catch (updateErr) {
                    console.error(`Error updating email ${email}:`, updateErr.message);
                    failCount++;
                }
            }
        }

        console.log(`\nUpdate Process Finished.`);
        console.log(`Successfully updated: ${successCount} emails`);
        console.log(`Failed or not found: ${failCount}`);

    } catch (err) {
        console.error("Critical error during processing:", err);
    } finally {
        mongoose.connection.close();
        console.log("MongoDB connection closed.");
    }
}

updateColIds();
