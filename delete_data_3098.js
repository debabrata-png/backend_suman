const mongoose = require('mongoose');
const Classenr1 = require('./Models/classenr1');
const MfacCourses = require('./Models/mfaccourses');
const User = require('./Models/user');
const Institution = require('./Models/institutions');

// ── NEW: School Marks & Config Models ─────────────────────────────────────
const StudentMarks9ds = require('./Models/studentmarks9ds');
const StudentMarks11ds = require('./Models/studentmarks11ds');
const SubjectComponentConfig9ds = require('./Models/subjectcomponentconfig9ds');
const SubjectComponentConfig11ds = require('./Models/subjectcomponentconfig11ds');
const CoScholasticGrade9ds = require('./Models/CoScholasticGrade9ds');
const CoScholasticActivity9ds = require('./Models/CoScholasticActivity9ds');
// ──────────────────────────────────────────────────────────────────────────

const MONGODB_URI = "mongodb+srv://user3:Hello123456@cluster0.bhzac.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const TARGET_COLID = 3052; // ← Change this if needed

const connectDB = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("✅ MongoDB connected");
    } catch (err) {
        console.error("❌ MongoDB connection error:", err);
        process.exit(1);
    }
};

const deleteData = async () => {
    await connectDB();

    try {
        console.log(`\n🗑️  Deleting data for colid: ${TARGET_COLID} ...\n`);

        // ── Existing deletions (kept for reference) ────────────────────────
        // const res1 = await Classenr1.deleteMany({ colid: TARGET_COLID });
        // console.log(`Deleted ${res1.deletedCount} records from Classenr1.`);

        // const re2 = await Institution.deleteMany({ admincolid: 3090 });
        // console.log(`Deleted ${re2.deletedCount} records from Institution.`);

        // const res2 = await MfacCourses.deleteMany({ colid: TARGET_COLID });
        // console.log(`Deleted ${res2.deletedCount} records from MfacCourses.`);

        // const res3 = await User.deleteMany({ colid: TARGET_COLID, role: 'Student' });
        // console.log(`Deleted ${res3.deletedCount} records from User (Students).`);

        // ══════════════════════════════════════════════════════════════════
        // STUDENT MARKS  (Class 6-10 and Class 11-12)
        // Uncomment whichever block(s) you want to run.
        // ══════════════════════════════════════════════════════════════════

        // -- 1. Student Marks (Class 6-10 / 9ds) --------------------------
        const r1 = await StudentMarks9ds.deleteMany({ colid: TARGET_COLID });
        console.log(`✅ Deleted ${r1.deletedCount} records from StudentMarks9ds (Class 6-10).`);

        // -- 2. Student Marks (Class 11-12 / 11ds) ------------------------
        const r2 = await StudentMarks11ds.deleteMany({ colid: TARGET_COLID });
        console.log(`✅ Deleted ${r2.deletedCount} records from StudentMarks11ds (Class 11-12).`);

        // ══════════════════════════════════════════════════════════════════
        // SUBJECT / SCHOLASTIC SUBJECT CONFIG
        // ══════════════════════════════════════════════════════════════════

        // -- 3. Subject Component Config (Class 6-10) ----------------------
        const r3 = await SubjectComponentConfig9ds.deleteMany({ colid: TARGET_COLID });
        console.log(`✅ Deleted ${r3.deletedCount} records from SubjectComponentConfig9ds.`);

        // -- 4. Subject Component Config (Class 11-12) ---------------------
        const r4 = await SubjectComponentConfig11ds.deleteMany({ colid: TARGET_COLID });
        console.log(`✅ Deleted ${r4.deletedCount} records from SubjectComponentConfig11ds.`);

        // ══════════════════════════════════════════════════════════════════
        // CO-SCHOLASTIC  (Grades and Activity definitions)
        // ══════════════════════════════════════════════════════════════════

        // -- 5. Co-Scholastic Grades (per student) -------------------------
        const r5 = await CoScholasticGrade9ds.deleteMany({ colid: TARGET_COLID });
        console.log(`✅ Deleted ${r5.deletedCount} records from CoScholasticGrade9ds.`);

        // -- 6. Co-Scholastic Activity definitions -------------------------
        const r6 = await CoScholasticActivity9ds.deleteMany({ colid: TARGET_COLID });
        console.log(`✅ Deleted ${r6.deletedCount} records from CoScholasticActivity9ds.`);

        console.log("\n✅ All selected deletions complete.");

    } catch (err) {
        console.error("❌ Error deleting data:", err);
    } finally {
        mongoose.connection.close();
        process.exit();
    }
};

deleteData();
