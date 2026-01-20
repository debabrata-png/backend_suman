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
    // {
    //     name: "Ms. Arzoo Qureshi",
    //     password: "Password@123",
    //     role: "Faculty",
    //     colid: 4000,
    //     user: "adminsopr@pu.edu.in",
    //     email: "arzoonoshi@gmail.com",
    //     phone: "7999962726",
    //     regno: "12/0153",
    //     programcode: "NA",
    //     admissionyear: "2025",
    //     semester: "8809-2161-5959",
    //     section: "NA",
    //     department: "Pharmacology",
    //     designation: "Assisatant Professor",
    //     gender: "Female",
    //     dob: new Date('1997-11-26'),
    //     fathername: "Mr Zaheer Ahmad",
    //     mothername: "Mrs Akhtar Anjum",
    //     address: "",
    //     joiningdate: new Date('2025-10-13'),
    //     rollno: "34057",
    //     status: 1,
    //     lastlogin: new Date('2027-06-01T10:00:00Z')
    // },
    // {
    //     name: "Mrs Prachi Sharma",
    //     password: "Password@123",
    //     role: "Faculty",
    //     colid: 4000,
    //     user: "adminsopr@pu.edu.in",
    //     email: "prachisharma6257258@gmail.com",
    //     phone: "8815284625",
    //     regno: "12/0152",
    //     programcode: "NA",
    //     admissionyear: "2025",
    //     semester: "2584-3623-4282",
    //     section: "NA",
    //     department: "Pharmaceutics",
    //     designation: "Assisatant Professor",
    //     gender: "Female",
    //     dob: new Date('1998-10-29'),
    //     fathername: "Mr Jay Prakash Sharma",
    //     mothername: "Mrs Sheela Sharma",
    //     address: "",
    //     joiningdate: new Date('2025-10-06'),
    //     rollno: "34056",
    //     status: 1,
    //     lastlogin: new Date('2027-06-01T10:00:00Z')
    // },
    {
        name: "Admin Mahajana",
        password: "Password@123",
        role: "Admin",
        colid: 5005,
        user: "admin@mes.com",
        email: "admin@mes.com",
        phone: "9999999999",
        regno: "12/0153",
        programcode: "NA",
        admissionyear: "2025-26",
        semester: "8NA",
        section: "NA",
        department: "Administration",
        designation: "Assisatant Professor",
        gender: "Female",
        rollno: "34057",
        status: 1,
        lastlogin: new Date('2027-06-01T10:00:00Z')
    },
    {
         name: "Admin All Mahajana",
        password: "Password@123",
        role: "Admin",
        colid: 5005,
        user: "adminall@mes.com",
        email: "adminall@mes.com",
        phone: "9999999999",
        regno: "12/0153",
        programcode: "NA",
        admissionyear: "2025-26",
        semester: "8NA",
        section: "NA",
        department: "Administration",
        designation: "Assisatant Professor",
        gender: "Female",
        rollno: "34057",
        status: 1,
        lastlogin: new Date('2027-06-01T10:00:00Z')
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