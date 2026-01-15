const User = require("./Models/user");
const mongoose = require("mongoose");

const users = [
    //     {
    //     name: "Vyagrashila Seva Samithi Admin",
    //     password: "Password@123",
    //     role:"Admin",
    //     colid: 4055,
    //     email: "admin@vss.com",
    //     phone: "9999999999",
    //     regno: "VSS0001",
    //     programcode: "NA",
    //     admissionyear: "2025-26",
    //     semester: "NA",
    //     section: "NA",
    //     department: "VC",
    //     status: 1,
    //     lastlogin: new Date('2026-12-01T10:00:00Z')
    // },
    // {
    //     name: "Vyagrashila Seva Samithi All",
    //     password: "Password@123",
    //     role:"All",
    //     colid: 4055,
    //     email: "adminall@vss.com",
    //     phone: "9999999999",
    //     regno: "VSS0003",
    //     programcode: "NA",
    //     admissionyear: "2025-26",
    //     semester: "NA",
    //     section: "NA",
    //     department: "Mathematics",
    //     status: 1,
    //     lastlogin: new Date('2026-12-01T10:00:00Z')
    // }
    {
        name: "Ms. Arzoo Qureshi",
        password: "Password@123",
        role: "Faculty",
        colid: 4000,
        user: "adminsopr@pu.edu.in",
        email: "arzoonoshi@gmail.com",
        phone: "7999962726",
        regno: "12/0153",
        programcode: "NA",
        admissionyear: "NA",
        semester: "8809-2161-5959",
        section: "NA",
        department: "Pharmacology",
        designation: "Assisatant Professor",
        gender: "Female",
        dob: "",
        fathername: "",
        mothername: "",
        address: "",
        city: "",
        joiningdate: "",
        rollno: "",
    }
];

const connectDB = async () => {
    try {
        await mongoose.connect("mongodb+srv://user3:Hello123456@cluster0.bhzac.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0", {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log("MongoDB connected");
    }catch (err) {
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
    }catch (err) {
        console.error(err);
    }
}

seeduser();