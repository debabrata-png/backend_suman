const User = require("./Models/user");
const mongoose = require("mongoose");

const colid_list = [3092, 3094];
const roles_list = ['NFS 1', 'NFS 2', 'NFS 3', "NS", "NS3", "NON FACULTY", "DT", "DTS"];

const connectDB = async () => {
    try {
        await mongoose.connect("mongodb+srv://user3:Hello123456@cluster0.bhzac.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0", {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log("MongoDB connected");
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

const updateUsers = async () => {
    await connectDB();
    try {
        const users = await User.find({
            colid: { $in: colid_list },
            role: { $in: roles_list }
        });

        console.log(`Found ${users.length} users to update.`);

        for (const user of users) {
            const oldEmail = user.email;
            const phone = user.phone;

            if (phone) {
                // Store the current email in the 'user' field
                user.user = oldEmail;
                // Update the 'email' field with the phone number
                user.email = phone;

                try {
                    await user.save();
                    console.log(`Successfully updated: ${oldEmail} | New Email: ${user.email} | Saved User: ${user.user}`);
                } catch (saveErr) {
                    if (saveErr.code === 11000) {
                        console.error(`Duplicate Email Error for ${phone}: Another user already uses this phone number as their email.`);
                    } else {
                        console.error(`Failed to update user ${oldEmail}: ${saveErr.message}`);
                    }
                }
            } else {
                console.warn(`User ${oldEmail} has no phone number, skipping.`);
            }
        }

        console.log("Migration process finished.");
        mongoose.connection.close();
    } catch (err) {
        console.error("Critical error during migration:", err);
    }
}

updateUsers();
