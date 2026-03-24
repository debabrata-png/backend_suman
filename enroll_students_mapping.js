const mongoose = require('mongoose');
const XLSX = require('xlsx');
const Classenr1 = require('./Models/classenr1');

const MONGODB_URI = "mongodb+srv://user3:Hello123456@cluster0.bhzac.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const COURSE_FILE = './courselist.xlsx';
const STUDENT_FILE = './studentlist.xlsx';
const BATCH_SIZE = 500;
const DELAY_MS = 500;

const connectDB = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("✅ MongoDB connected");
    } catch (err) {
        console.error("❌ MongoDB connection error:", err);
        process.exit(1);
    }
};

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const enrollStudents = async () => {
    await connectDB();

    try {
        console.log(`Reading course data from: ${COURSE_FILE}`);
        const courseWorkbook = XLSX.readFile(COURSE_FILE);
        const courseSheet = courseWorkbook.Sheets[courseWorkbook.SheetNames[0]];
        const courseRecords = XLSX.utils.sheet_to_json(courseSheet);
        console.log(`Found ${courseRecords.length} courses.`);

        console.log(`Reading student data from: ${STUDENT_FILE}`);
        const studentWorkbook = XLSX.readFile(STUDENT_FILE);
        const studentSheet = studentWorkbook.Sheets[studentWorkbook.SheetNames[0]];
        const studentRecords = XLSX.utils.sheet_to_json(studentSheet);
        console.log(`Found ${studentRecords.length} students.`);

        const enrollments = [];

        studentRecords.forEach(student => {
            const studentProgCode = String(student.programcode || '').trim();
            const studentSemester = String(student.semester || '').trim();

            // Find matching courses
            const matchingCourses = courseRecords.filter(course => {
                const courseProgCode = String(course.Programcode || '').trim();
                const courseSemester = String(course.Semester || '').trim();
                const courseNameStr = String(course.CourseName || course.coursename || '').toLowerCase();

                // Skip courses that contain 'practical' in their name
                if (courseNameStr.includes('practical')) {
                    return false;
                }

                return studentProgCode === courseProgCode && studentSemester === courseSemester;
            });

            matchingCourses.forEach(course => {
                enrollments.push({
                    name: student.name,
                    user: 'adminall@bmusurat.ac.in',
                    colid: Number(student.colid),
                    year: String(course.Year || course.year || ''),
                    program: course.Program,
                    programcode: String(course.Programcode || ''),
                    course: course.CourseName || course.coursename,
                    coursecode: String(course.CourseCode || course.coursecode || ''),
                    student: student.name,
                    regno: String(student.regno || ''),
                    learning: 'Regular',
                    gender: 'NA',
                    classgroup: student.section || 'NA',
                    coursetype: course.Type,
                    semester: String(course.Semester || ''),
                    active: 'Yes',
                    status1: 'Active',
                    comments: ''
                });
            });
        });

        console.log(`Prepared ${enrollments.length} enrollment records.`);

        if (enrollments.length > 0) {
            console.log("Sample Enrollment:", JSON.stringify(enrollments[0], null, 2));
            
            let totalInserted = 0;
            let batchCount = 0;

            for (let i = 0; i < enrollments.length; i += BATCH_SIZE) {
                const batch = enrollments.slice(i, i + BATCH_SIZE);
                batchCount++;
                try {
                    console.log(`Inserting batch ${batchCount} (${batch.length} records)...`);
                    const result = await Classenr1.insertMany(batch, { ordered: false });
                    totalInserted += result.length;
                    console.log(`   ✅ Batch ${batchCount} done. Total inserted so far: ${totalInserted}`);
                } catch (err) {
                    if (err.writeErrors) {
                        totalInserted += (err.insertedDocs ? err.insertedDocs.length : 0);
                        console.warn(`   ⚠️ Batch ${batchCount} partial success: ${err.insertedDocs ? err.insertedDocs.length : 0} inserted, ${err.writeErrors.length} failed/duplicate.`);
                    } else {
                        console.error(`   ❌ Batch ${batchCount} failed completely:`, err.message);
                    }
                }

                if (i + BATCH_SIZE < enrollments.length) {
                    await wait(DELAY_MS);
                }
            }

            console.log(`🏁 Enrollment complete. Total records inserted: ${totalInserted}`);
        } else {
            console.log("No enrollments to create.");
        }

    } catch (err) {
        console.error("❌ Error during enrollment:", err);
    } finally {
        mongoose.connection.close();
        process.exit();
    }
};

enrollStudents();
