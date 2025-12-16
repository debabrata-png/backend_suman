const User = require("./Models/user");
const mongoose = require("mongoose");
const readXlsxFile = require('read-excel-file/node');

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
        // Read Excel file
        const rows = await readXlsxFile('./cps_student_list.xlsx');
        
        // Get headers from first row
        const headers = rows[0];
        
        // Convert rows to user objects (skip header row)
        const users = rows.slice(1).map((row) => {
            const userObj = {};
            
            headers.forEach((header, index) => {
                userObj[header] = row[index];
            });
            
            // Set default values for required fields
            return {
                email: userObj.email || '',
                name: userObj.name || '',
                phone: userObj.phone || '',
                password: userObj.password || 'Password@123',
                role: userObj.role || 'Student',
                regno: userObj.regno || '',
                programcode: userObj.programcode || '',
                admissionyear: userObj.admissionyear || '',
                semester: userObj.semester || '1',
                section: userObj.section || '',
                gender: userObj.gender || '',
                department: userObj.department || 'School',
                photo: userObj.photo || '',
                category: userObj.category || '',
                address: userObj.address || '',
                quota: userObj.quota || '',
                fathername: userObj.fathername || '',
                mothername: userObj.mothername || '',
                dob: userObj.dob || '',
                eligibilityname: userObj.eligibilityname || '',
                degree: userObj.degree || '',
                minorsub: userObj.minorsub || '',
                vocationalsub: userObj.vocationalsub || '',
                mdcsub: userObj.mdcsub || '',
                othersub: userObj.othersub || '',
                merit: userObj.merit || '',
                obtain: userObj.obtain || 0,
                bonus: userObj.bonus || 0,
                weightage: userObj.weightage || 0,
                ncctype: userObj.ncctype || '',
                isdisabled: userObj.isdisabled || 'No',
                scholarship: userObj.scholarship || '',
                colid: 3052,
                status: 1,
                lastlogin: new Date('2026-12-01T10:00:00Z')
            };
        });
        
        // Insert users into database
        const insertedUsers = await User.insertMany(users);
        console.log(`Successfully seeded ${insertedUsers.length} users`);
        
        mongoose.connection.close();
    } catch (err) {
        console.error("Error seeding users:", err);
        mongoose.connection.close();
    }
}

seeduser();
