const User = require("./Models/user");
const mongoose = require("mongoose");
const programmasterds = require("./Models/programmasterds");
const pipelinestage = require("./Models/PipelineStageag");
const workloadassignmentds = require("./Models/workloadassignmentds")

const colid = [3098, 3090, 3091, 3092, 3094, 4000, 3098, 3096, 4004, 4008, 4010, 4012, 4014, 6050, 100100, 5050, 9050, 3000, 3060, 3052, 100500, 100520, 100540, 100560, 100580];
//const colid = [30]
const users = [
    {
        email: "pratima.pandey@careercollegeindia.com",
    },
]

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

const seeduser = async () => {
    await connectDB();
    try {
        //const user = await User.find({ email: "7979938921" });
        const lastLoginDate = new Date('2030-01-01T09:00:00Z');
        console.log(`Updating lastlogin for colids: ${colid.join(', ')} to ${lastLoginDate}`);

        const result = await User.updateMany(
            { colid: { $in: colid } },
            { $set: { lastlogin: lastLoginDate, status: 1 } }
        );

        console.log(`✅ Update Summary: ${result.modifiedCount} users updated.`);
        // const user = await User.updateMany({
        //     colid: 4014, role: "Student"
        // }, {
        //     $set: { password: "Password@123", status: 1, lastlogin: lastLoginDate }
        // })
        //const user = await workloadassignmentds.find({ colid: 4012 })
        //console.log(user)
        mongoose.connection.close();
    } catch (err) {
        console.error("❌ Error during update:", err);
    }
}

seeduser();