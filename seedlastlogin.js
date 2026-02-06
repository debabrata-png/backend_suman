const User = require("./Models/user");
const mongoose = require("mongoose");

const colid = 3000;

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
        // const user = await User.find({colid: colid});

        // console.log(user);

        // const user = await User.updateMany(
        //     { email: "demo2@campus.technology" },
        //     { $set: { lastlogin: new Date('2027-12-01T10:00:00Z') } }
        // )
        const user = await User.find(
            { email: "admin@mahajana.com" }
        )
        console.log(user);
        mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}

seeduser();