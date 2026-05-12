const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const Institution = require('./Models/institutions');
const User = require('./Models/user');
const MfacCourses = require('./Models/mfaccourses');
const Purchesds = require('./Models/purchesds');
const Vendords = require('./Models/vendords');

dotenv.config({ path: './config.env' });
const DB_URI = process.env.DATABASE2;

const seedData = async () => {
    try {
        console.log('Connecting to database...', DB_URI);
        await mongoose.connect(DB_URI);
        console.log('Connected to database.');

        const iimColid = 7070; // IIM is the main body

        const institutionsData = [
            { name: 'IIM', colid: 7070 },
            { name: 'IIM Dubai', colid: 7075 },
            { name: 'IIM Guwahati', colid: 7080 },
            { name: 'IIM Ahmedabad', colid: 7085 }
        ];

        let credentialsLog = "Admin Credentials for Seeded Institutions:\n\n";

        for (const inst of institutionsData) {
            console.log(`Processing ${inst.name} (colid: ${inst.colid})...`);

            // 1. Institution
            let institution = await Institution.findOne({ colid: inst.colid });
            const adminEmail = `admin_${inst.colid}@${inst.name.replace(/\s/g, '').toLowerCase()}.com`;
            if (!institution) {
                institution = new Institution({
                    institutionname: inst.name,
                    institutioncode: `CODE${inst.colid}`,
                    name: inst.name,
                    user: adminEmail,
                    address: 'Dummy Address',
                    state: 'Dummy State',
                    district: 'Dummy District',
                    type: 'University',
                    status: 'Active',
                    comments: 'Seeded via script',
                    colid: inst.colid,
                    admincolid: iimColid // IIM colid is the admin colid for all
                });
                await institution.save();
                console.log(`Created Institution: ${inst.name}`);
            } else {
                console.log(`Institution ${inst.name} already exists.`);
            }

            // 2. Admin User
            let admin = await User.findOne({ email: adminEmail });
            const adminPassword = 'Password@123';
            if (!admin) {
                admin = new User({
                    email: adminEmail,
                    name: `${inst.name} Admin`,
                    phone: `123456${inst.colid}`,
                    password: adminPassword,
                    role: 'Admin',
                    regno: `ADM${inst.colid}`,
                    programcode: 'NA',
                    admissionyear: 'NA',
                    semester: 'NA',
                    section: 'NA',
                    department: 'Administration',
                    colid: inst.colid, // Set to institution's colid
                    status: 1
                });
                await admin.save();
                console.log(`Created Admin User: ${admin.email}`);
            }

            credentialsLog += `Institution: ${inst.name}\n`;
            credentialsLog += `Admin ID/Email: ${adminEmail}\n`;
            credentialsLog += `Admin Password: ${adminPassword}\n`;
            credentialsLog += `Colid: ${inst.colid}\n`;
            credentialsLog += `---------------------------\n`;

            // 3. Faculty Users (20 faculties per institution)
            for (let i = 1; i <= 20; i++) {
                const facultyEmail = `faculty_${inst.colid}_${i}@${inst.name.replace(/\s/g, '').toLowerCase()}.com`;
                let faculty = await User.findOne({ email: facultyEmail });
                if (!faculty) {
                    faculty = new User({
                        email: facultyEmail,
                        name: `${inst.name} Faculty ${i}`,
                        phone: `99999${inst.colid}${i.toString().padStart(2, '0')}`,
                        password: 'Password@123',
                        role: 'Faculty',
                        regno: `FAC${inst.colid}-${i}`,
                        programcode: 'CS',
                        admissionyear: '2020',
                        semester: '1',
                        section: 'A',
                        department: 'Computer Science',
                        colid: inst.colid,
                        status: 1
                    });
                    await faculty.save();

                    // Create MfacCourse for each faculty
                    let course = await MfacCourses.findOne({ colid: inst.colid, user: facultyEmail });
                    if (!course) {
                        course = new MfacCourses({
                            name: `${inst.name} Core Course ${i}`,
                            user: facultyEmail,
                            colid: inst.colid,
                            year: '2024',
                            coursename: `CS Subject ${i}`,
                            coursecode: `CS101-${inst.colid}-${i}`,
                            type: 'Core',
                            status1: 'Active',
                            comments: 'Seeded via script'
                        });
                        await course.save();
                    }
                }
            }
            console.log(`Verified/Created 20 Faculty Users and Courses for ${inst.name}`);

            // 4. Student Users (180 students per institution)
            for (let i = 1; i <= 180; i++) {
                const studentEmail = `student_${inst.colid}_${i}@${inst.name.replace(/\s/g, '').toLowerCase()}.com`;
                let student = await User.findOne({ email: studentEmail });
                if (!student) {
                    student = new User({
                        email: studentEmail,
                        name: `${inst.name} Student ${i}`,
                        phone: `88888${inst.colid}${i.toString().padStart(3, '0')}`,
                        password: 'Password@123',
                        role: 'Student',
                        regno: `STU${inst.colid}-${i}`,
                        programcode: 'CS',
                        admissionyear: '2023',
                        semester: (i % 8) + 1 + '', // Distribute across semesters 1-8
                        section: String.fromCharCode(65 + (i % 4)), // Sections A, B, C, D
                        department: 'Computer Science',
                        colid: inst.colid,
                        status: 1
                    });
                    await student.save();
                }
            }
            console.log(`Verified/Created 180 Student Users for ${inst.name}`);


            // 6. Vendor
            const vendorName = `Vendor_${inst.name}`;
            let vendor = await Vendords.findOne({ colid: inst.colid, name: vendorName });
            if (!vendor) {
                vendor = new Vendords({
                    name: vendorName,
                    user: adminEmail,
                    colid: inst.colid,
                    email: `vendor@${inst.name.replace(/\s/g, '').toLowerCase()}.com`,
                    phone: `7777777${inst.colid}`,
                    address: 'Vendor Address',
                    gstno: 'GST123456',
                    status: 'Active'
                });
                await vendor.save();
                console.log(`Created Vendor: ${vendor.name}`);
            }

            // 7. Purchase Data - let's create 5 purchase objects
            for (let i = 1; i <= 5; i++) {
                let purchase = await Purchesds.findOne({ colid: inst.colid, vendorid: vendor._id, productname: `Laptops ${i}` });
                if (!purchase) {
                    purchase = new Purchesds({
                        name: `Purchase Order 00${i}`,
                        user: adminEmail,
                        colid: inst.colid,
                        vendorid: vendor._id,
                        vendorname: vendor.name,
                        productname: `Laptops ${i}`,
                        quantity: 10 * i,
                        price: 50000,
                        totalprice: 500000 * i,
                        discount: 10000 * i,
                        gst: 49000 * i,
                        finalprice: 539000 * i,
                        status: 'Completed'
                    });
                    await purchase.save();
                }
            }
            console.log(`Verified/Created Purchase Data for ${inst.name}`);
        }

        // Export admin credentials to a text file
        fs.writeFileSync('admin_credentials.txt', credentialsLog);
        console.log('Saved admin credentials to admin_credentials.txt');

        console.log('Seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error during seeding:', error);
        process.exit(1);
    }
};

seedData();
