const mongoose = require('mongoose');
const Institution = require('./Models/institutions');

const MONGODB_URI = "mongodb+srv://user3:Hello123456@cluster0.bhzac.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// Replace with the actual Admin ColID you want to use for testing
const TARGET_ADMIN_COLID = 4000;

// const sampleInstitutions = [
//     {
//         institutionname: "People's Institute of Hotel Management, Catering Technology & Applied Nutrition",
//         name: 'PU Admin & Faculty',
//         institutioncode: '18',
//         user: 'admin@pu.edu.in',
//         address: 'MP',
//         district: 'Bhopal',
//         type: 'Hotel Management',
//         status: 'Active',
//         colid: 3091, // New ColID for this institution
//         admincolid: 3090
//     },
//     {
//         institutionname: 'School of Pharmacy & Research',
//         name: 'PU Admin & Faculty',
//         institutioncode: '17',
//         user: 'admin@pu.edu.in',
//         address: 'MP',
//         district: 'Bhopal',
//         type: 'Pharmacy',
//         status: 'Active',
//         colid: 4000, // New ColID for this institution
//         admincolid: 3090
//     },
//     {
//         institutionname: "School of Research & Technology",
//         name: 'PU Admin & Faculty',
//         institutioncode: '16',
//         user: 'admin@pu.edu.in',
//         address: 'MP',
//         district: 'Bhopal',
//         type: 'Engineering',
//         status: 'Active',
//         colid: 3098, // New ColID for this institution
//         admincolid: 3090
//     },
//     {
//         institutionname: "Department of Humanities of Social Sciences",
//         name: 'PU Admin & Faculty',
//         institutioncode: '22',
//         user: 'admin@pu.edu.in',
//         address: 'MP',
//         district: 'Bhopal',
//         type: 'Humanities of Social Sciences',
//         status: 'Active',
//         colid: 4014, // New ColID for this institution
//         admincolid: 3090
//     },
//     {
//         institutionname: "Peoples Institute of Legal Studies",
//         name: 'PU Admin & Faculty',
//         institutioncode: '21',
//         user: 'admin@pu.edu.in',
//         address: 'MP',
//         district: 'Bhopal',
//         type: 'Law',
//         status: 'Active',
//         colid: 4012, // New ColID for this institution
//         admincolid: 3090
//     },
//     {
//         institutionname: "Peoples College of Paramedical Sciences and Research Center",
//         name: 'PU Admin & Faculty',
//         institutioncode: '19',
//         user: 'admin@pu.edu.in',
//         address: 'MP',
//         district: 'Bhopal',
//         type: 'Paramedical',
//         status: 'Active',
//         colid: 4004, // New ColID for this institution
//         admincolid: 3090
//     },
//     {
//         institutionname: "Peoples College of Nursing & Research Center",
//         name: 'PU Admin & Faculty',
//         institutioncode: '15',
//         user: 'admin@pu.edu.in',
//         address: 'MP',
//         district: 'Bhopal',
//         type: 'Nursing',
//         status: 'Active',
//         colid: 3096, // New ColID for this institution
//         admincolid: 3090
//     },
//     {
//         institutionname: "Center for Scientific Research & Development",
//         name: 'PU Admin & Faculty',
//         institutioncode: '20',
//         user: 'admin@pu.edu.in',
//         address: 'MP',
//         district: 'Bhopal',
//         type: 'Research & Development',
//         status: 'Active',
//         colid: 4010, // New ColID for this institution
//         admincolid: 3090
//     }, {
//         institutionname: "Peoples Institute of Management & Research",
//         name: 'PU Admin & Faculty',
//         institutioncode: '14',
//         user: 'admin@pu.edu.in',
//         address: 'MP',
//         district: 'Bhopal',
//         type: 'Management',
//         status: 'Active',
//         colid: 3094, // New ColID for this institution
//         admincolid: 3090
//     }
// ];

const sampleInstitutions = [
    // {
    //     institutionname: "Bhagwan Mahavir University",
    //     name: 'Admin',
    //     institutioncode: '18',
    //     user: 'admin@bmusurat.ac.in',
    //     address: 'MP',
    //     district: 'Surat',
    //     type: 'Surat',
    //     status: 'Active',
    //     colid: 6050, // New ColID for this institution
    //     admincolid: 6050,
    //     logo: "",
    //   }
    // {
    //     institutionname: "ST FRANCIS DE SALES COLLEGE – [SFS]",
    //     name: 'Admin',
    //     institutioncode: '01',
    //     user: 'admin1@sfs.in',
    //     address: 'Nagpur, Maharashtra',
    //     district: 'Nagpur',
    //     type: 'Autonomus',
    //     status: 'Active',
    //     colid: 3060, // New ColID for this institution
    //     admincolid: 3060,
    //     logo: "https://www.sfscollege.in/images/logo.png"
    // }
    {
        institutionname: "School of Computer Science & Application",
        name: 'Admin',
        institutioncode: '01',
        user: 'admin@shreyarthuni.in',
        address: 'Ahemdabad',
        district: 'Ahemdabad',
        type: 'Autonomus',
        status: 'Active',
        colid: 100220, // New ColID for this institution
        admincolid: 100200,
        logo: "https://shreyarthuni.ac.in/static/images/logoShrey.png"
    }
];

const seedInstitutions = async () => {
    try {
        await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log("✅ MongoDB connected for seeding");

        const result = await Institution.insertMany(sampleInstitutions);
        console.log(`✅ Seeded ${result.length} institutions.`);

    } catch (err) {
        console.error("❌ Error seeding institutions:", err);
    } finally {
        mongoose.connection.close();
        process.exit();
    }
};

seedInstitutions();
