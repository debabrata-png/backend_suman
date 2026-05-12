const mongoose = require('mongoose');

// Import Models
const ClassNew = require('./Models/classnew');
const ClassEnr1 = require('./Models/classenr1');
const MFacCourses = require('./Models/mfaccourses');
const Attendance = require('./Models/attendance');
const Project = require('./Models/projects');
const Pub = require('./Models/publications');
const Seminar = require('./Models/seminar');
const Consultancy = require('./Models/consultancy');
const Fees = require('./Models/fees');
const Ledgerstud = require('./Models/ledgerstud');
const MFeesCol = require('./Models/mfeescol');
const MJournal1 = require('./Models/mjournal1');
const MTrialBalance1 = require('./Models/mtrialbalance1');
const MBalanceSheet = require('./Models/mbalancesheet');
const Exam = require('./Models/exam');
const Feedback = require('./Models/feedback');
const User = require('./Models/user');

// Configuration
const MONGODB_URI = "mongodb+srv://user3:Hello123456@cluster0.bhzac.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const RECORDS_TO_CREATE = 60;
const ADMIN_EMAIL = 'demo@campus.technology';
const COLID = 30;

// Helpers
const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

const programs = ['BCA', 'MCA', 'B.Tech', 'M.Tech', 'MBA'];
const programCodes = ['BCA01', 'MCA01', 'BT01', 'MT01', 'MBA01'];
const departments = ['Computer Science', 'Management', 'Engineering', 'Humanities'];
const courses = ['Data Structures', 'Algorithms', 'Database', 'Operating Systems', 'Networks'];
const courseCodes = ['CS101', 'CS102', 'CS103', 'CS104', 'CS105'];
const sections = ['A', 'B', 'C'];
const semesters = ['1', '2', '3', '4', '5', '6', '7', '8'];
const statuses = ['Active', 'Inactive', 'Completed', 'Pending'];
const grades = ['A', 'B', 'C', 'D', 'E', 'F'];

const seedData = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // 1. Create Students (Users) first to get valid RegNos
        const students = [];
        console.log('Creating Students...');
        // for (let i = 0; i < RECORDS_TO_CREATE; i++) {
        //     const regno = `REG${2024000 + i}`;
        //     const studentData = {
        //         name: `Student ${i + 1}`,
        //         email: `student${i + 1}@college.edu`,
        //         phone: `987654${1000 + i}`,
        //         password: 'password123',
        //         role: 'Student',
        //         regno: regno,
        //         programcode: getRandomElement(programCodes),
        //         admissionyear: '2025-26',
        //         semester: getRandomElement(semesters),
        //         section: getRandomElement(sections),
        //         department: getRandomElement(departments),
        //         colid: COLID,
        //         status: 1,
        //         address: `Address ${i + 1}`,
        //         gender: Math.random() > 0.5 ? 'Male' : 'Female',
        //         dob: '2000-01-01',
        //         fathername: `Father ${i + 1}`,
        //         mothername: `Mother ${i + 1}`,
        //         user: ADMIN_EMAIL,
        //         addedby: 'Admin'
        //     };
        //     students.push(studentData);
        // }
        // Insert and fetch to get _ids if needed, usually just regno is used
        const createdStudents = await User.find({
            role: 'Student',
            colid: COLID,
            user: ADMIN_EMAIL
        });
        console.log(`✅ Created ${createdStudents.length} Students`);

        // Shared Data Arrays
        const batchData = {
            classNew: [],
            classEnr: [],
            facCourses: [],
            attendance: [],
            projects: [],
            pubs: [],
            seminars: [],
            consultancy: [],
            fees: [],
            ledger: [],
            feesCol: [],
            journal: [],
            trialBal: [],
            balSheet: [],
            exams: [],
            feedback: [],
            co: [],
            po: []
        };

        for (let i = 0; i < RECORDS_TO_CREATE; i++) {
            const student = getRandomElement(createdStudents);
            const courseName = getRandomElement(courses);
            const courseCode = getRandomElement(courseCodes);
            const programCode = getRandomElement(programCodes);

            // 1. Class Management
            // batchData.classNew.push({
            //     name: 'Sanchita',
            //     user: ADMIN_EMAIL,
            //     colid: COLID,
            //     year: '2025-26',
            //     program: 'Bachelor Programs',
            //     programcode: programCode,
            //     course: courseName,
            //     coursecode: courseCode,
            //     semester: getRandomElement(semesters),
            //     section: getRandomElement(sections),
            //     classdate: getRandomDate(new Date(2024, 0, 1), new Date()),
            //     classtime: '10:00 AM',
            //     topic: `Topic ${i + 1}`,
            //     status1: 'Completed',
            //     classtype: 'Theory'
            // });

            batchData.classEnr.push({
                name: 'Sanchita',
                user: ADMIN_EMAIL,
                colid: COLID,
                year: '2025-26',
                programcode: programCode,
                course: courseName,
                coursecode: courseCode,
                student: student.name,
                regno: student.regno,
                semester: student.semester,
                active: 'Yes',
                status1: 'Enrolled'
            });

            // batchData.facCourses.push({
            //     name: 'Sanchita',
            //     user: ADMIN_EMAIL,
            //     colid: COLID,
            //     year: '2025-26',
            //     coursename: courseName,
            //     coursecode: courseCode,
            //     type: 'Core',
            //     status1: 'Active'
            // });

            // // 2. Attendance
            // batchData.attendance.push({
            //     name: 'Sanchita',
            //     regno: student.regno,
            //     user: ADMIN_EMAIL,
            //     coursecode: courseCode,
            //     classid: `CLS${100 + i}`,
            //     semester: student.semester,
            //     section: student.section,
            //     classdate: getRandomDate(new Date(2024, 0, 1), new Date()),
            //     course: courseName,
            //     colid: COLID,
            //     status: 1
            // });

            // // 3. Personal Data
            // batchData.projects.push({
            //     name: 'Sanchita',
            //     user: ADMIN_EMAIL,
            //     project: `Research on ${courseName}`,
            //     agency: `Agency ${i + 1}`,
            //     type: 'Research',
            //     yop: '2025-26',
            //     department: getRandomElement(departments),
            //     funds: getRandomInt(10000, 500000),
            //     colid: COLID,
            //     duration: '6 Months',
            //     status1: 'Ongoing'
            // });

            // batchData.pubs.push({
            //     name: 'Sanchita',
            //     user: ADMIN_EMAIL,
            //     department: student.department,
            //     title: `Publication Title ${i + 1}`,
            //     journal: `Journal of ${courseName}`,
            //     yop: '2025-26',
            //     colid: COLID,
            //     issn: `ISSN-${getRandomInt(1000, 9999)}`,
            //     articlelink: 'http://example.com',
            //     journallink: 'http://example.com',
            //     ugclisted: 'Yes'
            // });

            // batchData.seminars.push({
            //     name: 'Sanchita',
            //     user: ADMIN_EMAIL,
            //     title: `Seminar on ${courseName}`,
            //     duration: '2 Hours',
            //     yop: '2025-26',
            //     membership: 'Member',
            //     amount: getRandomInt(1000, 5000),
            //     type: 'National',
            //     colid: COLID
            // });

            // batchData.consultancy.push({
            //     name: 'Sanchita',
            //     user: ADMIN_EMAIL,
            //     colid: COLID,
            //     year: '2025-26',
            //     consultant: student.name,
            //     advisor: `Advisor ${i + 1}`,
            //     agency: `Client ${i + 1}`,
            //     contact: 9876543210,
            //     revenue: getRandomInt(50000, 1000000),
            //     status1: 'Completed',
            //     comments: 'Succesful'
            // });

            // // 4. Financials
            // batchData.fees.push({
            //     name: 'Sanchita',
            //     user: ADMIN_EMAIL,
            //     programcode: programCode,
            //     feegroup: 'Sem Fees',
            //     semester: student.semester,
            //     feeeitem: 'Tuition',
            //     academicyear: '2025-26',
            //     feecategory: 'General',
            //     classdate: new Date(),
            //     amount: 50000,
            //     colid: COLID,
            //     status: 'Active'
            // });

            // batchData.ledger.push({
            //     name: 'Sanchita',
            //     user: ADMIN_EMAIL,
            //     feegroup: 'Sem Fees',
            //     regno: student.regno,
            //     student: student.name,
            //     feeitem: 'Tuition',
            //     amount: 50000,
            //     academicyear: '2025-26',
            //     colid: COLID,
            //     classdate: new Date(),
            //     status: 'Paid'
            // });

            // batchData.feesCol.push({
            //     name: 'Sanchita',
            //     user: ADMIN_EMAIL,
            //     colid: COLID,
            //     year: '2025-26',
            //     programcode: programCode,
            //     student: student.name,
            //     regno: student.regno,
            //     amount: 50000,
            //     paymode: 'Online',
            //     status1: 'Verified'
            // });

            // batchData.journal.push({
            //     name: 'Sanchita',
            //     user: ADMIN_EMAIL,
            //     colid: COLID,
            //     year: '2025-26',
            //     amount: getRandomInt(1000, 10000),
            //     type: Math.random() > 0.5 ? 'Debit' : 'Credit',
            //     transaction: 'Fee Payment',
            //     student: student.name,
            //     regno: student.regno
            // });

            // batchData.trialBal.push({
            //     name: 'Sanchita',
            //     user: ADMIN_EMAIL,
            //     colid: COLID,
            //     year: '2025-26',
            //     account: 'Tuition Fees',
            //     amount: getRandomInt(10000, 100000),
            //     type: 'Credit'
            // });

            // batchData.balSheet.push({
            //     name: 'Sanchita',
            //     user: ADMIN_EMAIL,
            //     colid: COLID,
            //     year: '2025-26',
            //     account: 'Cash in Hand',
            //     amount: getRandomInt(100000, 500000),
            //     debit: getRandomInt(100000, 500000),
            //     credit: 0
            // });

            // // 5. Exams
            // batchData.exams.push({
            //     academicyear: '2025-26',
            //     examname: `Mid Term ${courseName}`,
            //     user: ADMIN_EMAIL,
            //     coursecode: courseCode,
            //     link: 'http://moodlehub.com',
            //     proctorlink: 'http://proctor.com',
            //     semester: student.semester,
            //     section: student.section,
            //     classdate: new Date(),
            //     enddate: new Date(),
            //     programcode: programCode,
            //     course: courseName,
            //     colid: COLID,
            //     status: 1
            // });

            // // 6. Feedback
            // batchData.feedback.push({
            //     name: 'Sanchita',
            //     regno: student.regno,
            //     user: ADMIN_EMAIL,
            //     semester: student.semester,
            //     section: student.section,
            //     feedbackdate: new Date(),
            //     type: 'Faculty',
            //     question: 'How was the class?',
            //     colid: COLID,
            //     score: getRandomInt(1, 5)
            // });
        }

        // Setup insert promises
        const inserts = [
            // ClassNew.insertMany(batchData.classNew),
            ClassEnr1.insertMany(batchData.classEnr),
            // MFacCourses.insertMany(batchData.facCourses),
            // Attendance.insertMany(batchData.attendance),
            // Project.insertMany(batchData.projects),
            // Pub.insertMany(batchData.pubs),
            // Seminar.insertMany(batchData.seminars),
            // Consultancy.insertMany(batchData.consultancy),
            // Fees.insertMany(batchData.fees),
            // Ledgerstud.insertMany(batchData.ledger),
            // MFeesCol.insertMany(batchData.feesCol),
            // MJournal1.insertMany(batchData.journal),
            // MTrialBalance1.insertMany(batchData.trialBal),
            // MBalanceSheet.insertMany(batchData.balSheet),
            // Exam.insertMany(batchData.exams),
            // Feedback.insertMany(batchData.feedback),
        ];

        console.log('Inserting data batches...');
        await Promise.all([
            // ClassNew.insertMany(batchData.classNew),
            ClassEnr1.insertMany(batchData.classEnr),
            // MFacCourses.insertMany(batchData.facCourses),
            // Attendance.insertMany(batchData.attendance),
            // Project.insertMany(batchData.projects),
            // Pub.insertMany(batchData.pubs),
            // Seminar.insertMany(batchData.seminars),
            // Consultancy.insertMany(batchData.consultancy),
            // Fees.insertMany(batchData.fees),
            // Ledgerstud.insertMany(batchData.ledger),
            // MFeesCol.insertMany(batchData.feesCol),
            // MJournal1.insertMany(batchData.journal),
            // MTrialBalance1.insertMany(batchData.trialBal),
            // MBalanceSheet.insertMany(batchData.balSheet),
            // Exam.insertMany(batchData.exams),
            // Feedback.insertMany(batchData.feedback),
        ]);

        console.log('✅ All data seeded successfully!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error seeding data:', error);
        process.exit(1);
    }
};

seedData();
