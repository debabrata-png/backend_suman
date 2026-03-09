const User = require("./Models/user");
const mongoose = require("mongoose");

const users = [
    {
        name: "Campus",
        password: "Password@123",
        role: "All",
        colid: 1,
        user: "localdemo@campus.technology",
        email: "localdemo@campus.technology",
        phone: "9993020624",
        regno: "12/0153",
        programcode: "NA",
        admissionyear: "2025",
        semester: "8809-2161-5959",
        section: "NA",
        department: "Administration",
        designation: "Assisatant Professor",
        gender: "Male",
        dob: new Date('1997-11-26'),
        address: "",
        joiningdate: new Date('2025-10-13'),
        rollno: "34057",
        status: 1,
        lastlogin: new Date('2027-06-01T10:00:00Z')
    },
];

const connectDB = async () => {
    try {
        await mongoose.connect("mongodb+srv://debabrata:8aY0vJbwO0FPrbpT@cluster0.5htb0js.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0", {
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
        const user = await User.insertMany(users);
        console.log("Users seeded:", user);
        mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}

seeduser();