const User = require("./Models/user");
const mongoose = require("mongoose");

const colid = [3098, 3090, 3091, 3092, 3094, 4000, 3098, 3096, 4004, 4008, 4010, 4012, 4014, 6050, 100100];
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
        //const user = await User.find({ email: "9826028910" });



        const user = await User.updateMany(
            {
                colid: { $in: colid }
            },
            { $set: { lastlogin: "2030-03-05T16:48:19+05:30" } }
        )
        // const user = await User.updateMany(
        //     {
        //         colid: 100100, role: "Admin"
        //     },
        //     { $set: { role: "All" } }
        // )
        // const user = await User.deleteOne(
        //     { email: "sumeet.kothari@cdgi.edu.in" }
        // )
        console.log(user);
        mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}

seeduser();