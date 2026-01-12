const mongoose = require('mongoose');
const Institution = require('./Models/institutions');

const MONGODB_URI = "mongodb+srv://user3:Hello123456@cluster0.bhzac.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// Replace with the actual Admin ColID you want to use for testing
const TARGET_ADMIN_COLID = 4000;

const sampleInstitutions = [
    {
        institutionname: "People's Institute of Hotel Management, Catering Technology & Applied Nutrition",
        name: 'PU Admin & Faculty',
        institutioncode: '18',
        user: 'admin@pu.edu.in',
        address: 'MP',
        district: 'Bhopal',
        type: 'Engineering',
        status: 'Active',
        colid: 3091, // New ColID for this institution
        admincolid: 3090
    },
    {
        institutionname: 'School of  Pharmacy & Research',
        name: 'Management School Branch',
        institutioncode: '17',
        user: 'admin@pu.edu.in',
        address: 'MP',
        district: 'Bhopal',
        type: 'Management',
        status: 'Active',
        colid: 4000, // New ColID for this institution
        admincolid: 3090
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
