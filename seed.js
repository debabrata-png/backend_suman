const User = require("./Models/user");
const mongoose = require("mongoose");

const users = [
    {
        name: "CGI Admin",
        password: "Password@123",
        role:"All",
        colid: 3000,
        email: "admin@cgi.edu.in",
        phone: "9999999999",
        regno: "PRU0001",
        programcode: "NA",
        admissionyear: "2025-26",
        semester: "NA",
        section: "NA",
        department: "VC",
        status: 1,
        lastlogin: new Date('2026-12-01T10:00:00Z')
    },
    // {
    //     name: "IET DAVV Faculty 1",
    //     password: "Password@123",
    //     role:"Faculty",
    //     colid: 3085,
    //     email: "faculty1@ietdavv.edu.in",
    //     phone: "9999999999",
    //     regno: "PRU0002",
    //     programcode: "NA",
    //     admissionyear: "2025-26",
    //     semester: "NA",
    //     section: "NA",
    //     department: "Mathematics",
    //     status: 1,
    //     lastlogin: new Date('2026-12-01T10:00:00Z')
    // },
    // {
    //     name: "IET DAVV Faculty All",
    //     password: "Password@123",
    //     role:"All",
    //     colid: 3085,
    //     email: "facultyall@ietdavv.edu.in",
    //     phone: "9999999999",
    //     regno: "PRU0003",
    //     programcode: "NA",
    //     admissionyear: "2025-26",
    //     semester: "NA",
    //     section: "NA",
    //     department: "Mathematics",
    //     status: 1,
    //     lastlogin: new Date('2026-12-01T10:00:00Z')
    // }
]

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