const User = require("./Models/user");
const mongoose = require("mongoose");

const users = [
    //     {
    //     name: "PIHMCT&AN Admin",
    //     password: "Password@123",
    //     role:"Admin",
    //     colid: 3091,
    //     email: "adminpihmcta@pu.edu.in",
    //     phone: "9999999999",
    //     regno: "PU0001",
    //     programcode: "NA",
    //     admissionyear: "2025-26",
    //     semester: "NA",
    //     section: "NA",
    //     department: "VC",
    //     status: 1,
    //     lastlogin: new Date('2026-12-01T10:00:00Z')
    // },
    // {
    //     name: "PIHMCT&AN Admin All",
    //     password: "Password@123",
    //     role:"All",
    //     colid: 3091,
    //     email: "adminallpihmcta@pu.edu.in",
    //     phone: "9999999999",
    //     regno: "PU0003",
    //     programcode: "NA",
    //     admissionyear: "2025-26",
    //     semester: "NA",
    //     section: "NA",
    //     department: "Mathematics",
    //     status: 1,
    //     lastlogin: new Date('2026-12-01T10:00:00Z')
    // },
    // {
    //     name: "PDA Admin",
    //     password: "Password@123",
    //     role: "Admin",
    //     colid: 3092,
    //     email: "adminpda@pu.edu.in",
    //     phone: "9999999999",
    //     regno: "PU10001",
    //     programcode: "NA",
    //     admissionyear: "2025-26",
    //     semester: "NA",
    //     section: "NA",
    //     department: "VC",
    //     status: 1,
    //     lastlogin: new Date('2026-12-01T10:00:00Z')
    // },
    // {
    //     name: "PDA Admin All",
    //     password: "Password@123",
    //     role: "All",
    //     colid: 3092,
    //     email: "adminallpda@pu.edu.in",
    //     phone: "9999999999",
    //     regno: "PU10002",
    //     programcode: "NA",
    //     admissionyear: "2025-26",
    //     semester: "NA",
    //     section: "NA",
    //     department: "Mathematics",
    //     status: 1,
    //     lastlogin: new Date('2026-12-01T10:00:00Z')
    // },
    // {
    //     name: "PIMR Admin",
    //     password: "Password@123",
    //     role: "Admin",
    //     colid: 3094,
    //     email: "adminpimr@pu.edu.in",
    //     phone: "9999999999",
    //     regno: "PU10003",
    //     programcode: "NA",
    //     admissionyear: "2025-26",
    //     semester: "NA",
    //     section: "NA",
    //     department: "VC",
    //     status: 1,
    //     lastlogin: new Date('2026-12-01T10:00:00Z')
    // },
    // {
    //     name: "PIMR Admin All",
    //     password: "Password@123",
    //     role: "All",
    //     colid: 3094,
    //     email: "adminallpimr@pu.edu.in",
    //     phone: "9999999999",
    //     regno: "PU10004",
    //     programcode: "NA",
    //     admissionyear: "2025-26",
    //     semester: "NA",
    //     section: "NA",
    //     department: "Mathematics",
    //     status: 1,
    //     lastlogin: new Date('2026-12-01T10:00:00Z')
    // },
    // {
    //     name: "PCN&RC Admin",
    //     password: "Password@123",
    //     role: "Admin",
    //     colid: 3096,
    //     email: "adminpcnrc@pu.edu.in",
    //     phone: "9999999999",
    //     regno: "PU10005",
    //     programcode: "NA",
    //     admissionyear: "2025-26",
    //     semester: "NA",
    //     section: "NA",
    //     department: "VC",
    //     status: 1,
    //     lastlogin: new Date('2026-12-01T10:00:00Z')
    // },
    // {
    //     name: "PCN&RC Admin All",
    //     password: "Password@123",
    //     role: "All",
    //     colid: 3096,
    //     email: "adminallpcnrc@pu.edu.in",
    //     phone: "9999999999",
    //     regno: "PU10006",
    //     programcode: "NA",
    //     admissionyear: "2025-26",
    //     semester: "NA",
    //     section: "NA",
    //     department: "Mathematics",
    //     status: 1,
    //     lastlogin: new Date('2026-12-01T10:00:00Z')
    // },
    // {
    //     name: "SORT Admin",
    //     password: "Password@123",
    //     role: "Admin",
    //     colid: 3098,
    //     email: "adminsort@pu.edu.in",
    //     phone: "9999999999",
    //     regno: "PU10007",
    //     programcode: "NA",
    //     admissionyear: "2025-26",
    //     semester: "NA",
    //     section: "NA",
    //     department: "VC",
    //     status: 1,
    //     lastlogin: new Date('2026-12-01T10:00:00Z')
    // },
    // {
    //     name: "SORT Admin All",
    //     password: "Password@123",
    //     role: "All",
    //     colid: 3098,
    //     email: "adminallsort@pu.edu.in",
    //     phone: "9999999999",
    //     regno: "PU10008",
    //     programcode: "NA",
    //     admissionyear: "2025-26",
    //     semester: "NA",
    //     section: "NA",
    //     department: "Mathematics",
    //     status: 1,
    //     lastlogin: new Date('2026-12-01T10:00:00Z')
    // },
    // {
    //     name: "SOPR Admin",
    //     password: "Password@123",
    //     role: "Admin",
    //     colid: 4000,
    //     email: "adminsopr@pu.edu.in",
    //     phone: "9999999999",
    //     regno: "PU10009",
    //     programcode: "NA",
    //     admissionyear: "2025-26",
    //     semester: "NA",
    //     section: "NA",
    //     department: "VC",
    //     status: 1,
    //     lastlogin: new Date('2026-12-01T10:00:00Z')
    // },
    // {
    //     name: "SOPR Admin All",
    //     password: "Password@123",
    //     role: "All",
    //     colid: 4000,
    //     email: "adminallsopr@pu.edu.in",
    //     phone: "9999999999",
    //     regno: "PU10010",
    //     programcode: "NA",
    //     admissionyear: "2025-26",
    //     semester: "NA",
    //     section: "NA",
    //     department: "Mathematics",
    //     status: 1,
    //     lastlogin: new Date('2026-12-01T10:00:00Z')
    // },
    // {
    //     name: "PCPSRC Admin",
    //     password: "Password@123",
    //     role: "Admin",
    //     colid: 4004,
    //     email: "adminpcpsrc@pu.edu.in",
    //     phone: "9999999999",
    //     regno: "PU10013",
    //     programcode: "NA",
    //     admissionyear: "2025-26",
    //     semester: "NA",
    //     section: "NA",
    //     department: "VC",
    //     status: 1,
    //     lastlogin: new Date('2026-12-01T10:00:00Z')
    // },
    // {
    //     name: "PCPSRC Admin All",
    //     password: "Password@123",
    //     role: "All",
    //     colid: 4004,
    //     email: "adminallpcpsrc@pu.edu.in",
    //     phone: "9999999999",
    //     regno: "PU10014",
    //     programcode: "NA",
    //     admissionyear: "2025-26",
    //     semester: "NA",
    //     section: "NA",
    //     department: "Mathematics",
    //     status: 1,
    //     lastlogin: new Date('2026-12-01T10:00:00Z')
    // },
    // {
    //     name: "CSRD Admin",
    //     password: "Password@123",
    //     role: "Admin",
    //     colid: 4010,
    //     email: "admincsrd@pu.edu.in",
    //     phone: "9999999999",
    //     regno: "PU10015",
    //     programcode: "NA",
    //     admissionyear: "2025-26",
    //     semester: "NA",
    //     section: "NA",
    //     department: "VC",
    //     status: 1,
    //     lastlogin: new Date('2026-12-01T10:00:00Z')
    // },
    // {
    //     name: "CSRD Admin All",
    //     password: "Password@123",
    //     role: "All",
    //     colid: 4010,
    //     email: "adminallcsrd@pu.edu.in",
    //     phone: "9999999999",
    //     regno: "PU10016",
    //     programcode: "NA",
    //     admissionyear: "2025-26",
    //     semester: "NA",
    //     section: "NA",
    //     department: "Mathematics",
    //     status: 1,
    //     lastlogin: new Date('2026-12-01T10:00:00Z')
    // },
    // {
    //     name: "PILS Admin",
    //     password: "Password@123",
    //     role: "Admin",
    //     colid: 4012,
    //     email: "adminpils@pu.edu.in",
    //     phone: "9999999999",
    //     regno: "PU10017",
    //     programcode: "NA",
    //     admissionyear: "2025-26",
    //     semester: "NA",
    //     section: "NA",
    //     department: "VC",
    //     status: 1,
    //     lastlogin: new Date('2026-12-01T10:00:00Z')
    // },
    // {
    //     name: "PILS Admin All",
    //     password: "Password@123",
    //     role: "All",
    //     colid: 4012,
    //     email: "adminallpils@pu.edu.in",
    //     phone: "9999999999",
    //     regno: "PU10018",
    //     programcode: "NA",
    //     admissionyear: "2025-26",
    //     semester: "NA",
    //     section: "NA",
    //     department: "Mathematics",
    //     status: 1,
    //     lastlogin: new Date('2026-12-01T10:00:00Z')
    // },
    // {
    //     name: "DHSS Admin",
    //     password: "Password@123",
    //     role: "Admin",
    //     colid: 4014,
    //     email: "admindhss@pu.edu.in",
    //     phone: "9999999999",
    //     regno: "PU10019",
    //     programcode: "NA",
    //     admissionyear: "2025-26",
    //     semester: "NA",
    //     section: "NA",
    //     department: "VC",
    //     status: 1,
    //     lastlogin: new Date('2026-12-01T10:00:00Z')
    // },
    // {
    //     name: "DHSS Admin All",
    //     password: "Password@123",
    //     role: "All",
    //     colid: 4014,
    //     email: "adminalldhss@pu.edu.in",
    //     phone: "9999999999",
    //     regno: "PU10020",
    //     programcode: "NA",
    //     admissionyear: "2025-26",
    //     semester: "NA",
    //     section: "NA",
    //     department: "Mathematics",
    //     status: 1,
    //     lastlogin: new Date('2026-12-01T10:00:00Z')
    // }
     {
        name: "PU Admin",
        password: "Password@123",
        role: "Admin",
        colid: 3090,
        email: "admin@pu.edu.in",
        phone: "9999999999",
        regno: "PU10019",
        programcode: "NA",
        admissionyear: "2025-26",
        semester: "NA",
        section: "NA",
        department: "VC",
        status: 1,
        lastlogin: new Date('2026-12-01T10:00:00Z')
    },
    {
        name: "PU Admin All",
        password: "Password@123",
        role: "All",
        colid: 3090,
        email: "adminall@pu.edu.in",
        phone: "9999999999",
        regno: "PU10020",
        programcode: "NA",
        admissionyear: "2025-26",
        semester: "NA",
        section: "NA",
        department: "Mathematics",
        status: 1,
        lastlogin: new Date('2026-12-01T10:00:00Z')
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