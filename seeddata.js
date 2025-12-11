const mongoose = require('mongoose');
const ClassNew = require('./Models/classnew');
const AttendanceNew = require('./Models/attendancenew');

// MongoDB connection string - update with your database URL
const MONGODB_URI = "mongodb+srv://user3:Hello123456@cluster0.bhzac.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// Sample data arrays
const courses = ['Data Structures', 'Web Development', 'Database Management', 'Operating Systems', 'Computer Networks', 
                 'Software Engineering', 'Computer Graphics', 'Artificial Intelligence', 'Cloud Computing', 'Cyber Security'];
const courseCodes = ['BCA301', 'BCA302', 'BCA303', 'BCA304', 'BCA305', 'BCA306', 'BCA307', 'BCA308', 'BCA309', 'BCA310'];
const semesters = ['1', '2', '3', '4', '5', '6'];
const sections = ['A', 'B', 'C'];
const classTypes = ['Theory', 'Lab', 'Tutorial'];
const topics = ['Introduction', 'Advanced Concepts', 'Practical Applications', 'Case Studies', 'Problem Solving'];
const modules = ['Module 1', 'Module 2', 'Module 3', 'Module 4', 'Module 5'];

// Sample student data
const students = [
  { name: 'Student 1', regno: 'REG001' },
  { name: 'Student 2', regno: 'REG002' },
  { name: 'Student 3', regno: 'REG003' },
  { name: 'Student 4', regno: 'REG004' },
  { name: 'Student 5', regno: 'REG005' },
  { name: 'Student 6', regno: 'REG006' },
  { name: 'Student 7', regno: 'REG007' },
  { name: 'Student 8', regno: 'REG008' },
  { name: 'Student 9', regno: 'REG009' },
  { name: 'Student 10', regno: 'REG010' },
  { name: 'Student 11', regno: 'REG011' },
  { name: 'Student 12', regno: 'REG012' },
  { name: 'Student 13', regno: 'REG013' },
  { name: 'Student 14', regno: 'REG014' },
  { name: 'Student 15', regno: 'REG015' },
  { name: 'Student 16', regno: 'REG016' },
  { name: 'Student 17', regno: 'REG017' },
  { name: 'Student 18', regno: 'REG018' },
  { name: 'Student 19', regno: 'REG019' },
  { name: 'Student 20', regno: 'REG020' }
];

// Function to generate random date within last 3 months
const getRandomDate = () => {
  const today = new Date();
  const pastDate = new Date();
  pastDate.setMonth(today.getMonth() - 3);
  const randomTime = pastDate.getTime() + Math.random() * (today.getTime() - pastDate.getTime());
  return new Date(randomTime);
};

// Function to generate time slot
const getRandomTime = () => {
  const times = ['09:00-10:00', '10:00-11:00', '11:00-12:00', '12:00-13:00', '14:00-15:00', '15:00-16:00'];
  return times[Math.floor(Math.random() * times.length)];
};

const seedData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data (optional - remove if you want to keep existing data)
    await ClassNew.deleteMany({ user: 'demo@campus.technology', colid: 30 });
    await AttendanceNew.deleteMany({ user: 'demo@campus.technology', colid: 30 });
    console.log('Cleared existing data');

    const classIds = [];

    // Create 10 classes
    for (let i = 0; i < 10; i++) {
      const courseIndex = i % courses.length;
      const classDate = getRandomDate();

      const classData = {
        name: 'Sanchita',
        user: 'demo@campus.technology',
        colid: 30,
        year: '2024-2025',
        program: 'Bachelor of Computer Applications',
        programcode: 'BCA01',
        course: courses[courseIndex],
        coursecode: courseCodes[courseIndex],
        semester: semesters[i % semesters.length],
        section: sections[i % sections.length],
        classdate: classDate,
        classtime: getRandomTime(),
        topic: topics[i % topics.length],
        module: modules[i % modules.length],
        link: `https://meet.google.com/bca-class-${i + 1}`,
        classtype: classTypes[i % classTypes.length],
        status1: 'Completed',
        comments: `Class ${i + 1} conducted successfully`
      };

      const newClass = await ClassNew.create(classData);
      classIds.push(newClass._id);
      console.log(`Created Class ${i + 1}: ${newClass._id}`);

      // Create 20 attendance records for each class
      const attendanceRecords = [];
      for (let j = 0; j < 20; j++) {
        const student = students[j];
        const isPresent = Math.random() > 0.2; // 80% attendance rate

        const attendanceData = {
          name: 'Sanchita',
          user: 'demo@campus.technology',
          colid: 30,
          year: '2024-2025',
          classid: newClass._id.toString(),
          programcode: 'BCA01',
          program: 'Bachelor of Computer Applications',
          course: courses[courseIndex],
          coursecode: courseCodes[courseIndex],
          student: student.name,
          regno: student.regno,
          att: isPresent ? 1 : 0,
          classdate: classDate,
          semester: semesters[i % semesters.length],
          section: sections[i % sections.length],
          status1: isPresent ? 'Present' : 'Absent',
          comments: isPresent ? 'Attended' : 'Did not attend',
          type: classTypes[i % classTypes.length],
          reason: isPresent ? '' : 'Not specified'
        };

        attendanceRecords.push(attendanceData);
      }

      await AttendanceNew.insertMany(attendanceRecords);
      console.log(`Created 20 attendance records for Class ${i + 1}`);
    }

    console.log('\n✅ Data seeding completed successfully!');
    console.log(`Created ${classIds.length} classes`);
    console.log(`Created ${classIds.length * 20} attendance records`);
    console.log('All records have programcode: BCA01');

    // Close connection
    await mongoose.connection.close();
    console.log('Database connection closed');

  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

// Run the seed script
seedData();
