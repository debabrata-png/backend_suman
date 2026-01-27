const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const STUDENT_FILES = [
    'PCPS STUDENT DATA.xlsx',
];
const WORKLOAD_FILE = 'PCPS WORKLOAD.xlsx';
const OUTPUT_FILE = 'classenr_pcps_output.xlsx';

const mapData = () => {
    console.log("Starting data mapping...");

    // 1. Load Student Data
    let allStudents = [];
    STUDENT_FILES.forEach(file => {
        const filePath = path.join(__dirname, file);
        if (fs.existsSync(filePath)) {
            console.log(`Reading ${file}...`);
            const workbook = XLSX.readFile(filePath);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(sheet);
            allStudents = allStudents.concat(data);
        } else {
            console.error(`Warning: ${file} not found.`);
        }
    });
    console.log(`Total students loaded: ${allStudents.length}`);

    // Index students by programcode and semester for faster lookup
    // Key: `${programcode}_${semester}`
    const studentsMap = {};
    const studentsBySemester = {}; // Fallback map

    allStudents.forEach(student => {
        // Normalize keys just in case
        const programcode = student.programcode;
        const semester = student.semester;

        if (programcode && semester) {
            const key = `${programcode}_${semester}`;
            if (!studentsMap[key]) {
                studentsMap[key] = [];
            }
            studentsMap[key].push(student);
        }

        // Populate semester-only map
        if (semester) {
            const semKey = String(semester);
            if (!studentsBySemester[semKey]) {
                studentsBySemester[semKey] = [];
            }
            studentsBySemester[semKey].push(student);
        }
    });

    // 2. Load Workload Data
    const workloadPath = path.join(__dirname, WORKLOAD_FILE);
    if (!fs.existsSync(workloadPath)) {
        console.error(`Error: ${WORKLOAD_FILE} not found.`);
        return;
    }
    console.log(`Reading ${WORKLOAD_FILE}...`);
    const wbWorkload = XLSX.readFile(workloadPath);
    const workloadData = XLSX.utils.sheet_to_json(wbWorkload.Sheets[wbWorkload.SheetNames[0]]);
    console.log(`Total workload entries: ${workloadData.length}`);

    // 3. Map Data
    const outputData = [];

    workloadData.forEach(workload => {
        const pCodeRaw = workload.programcode;
        const sem = workload.semester;

        // // --- PROMOTION LOGIC START ---
        // // Map Workload Semester X to Student Semester X-1
        // // e.g. Workload Sem 2 needs Students from Sem 1
        // const workSemNum = parseInt(sem, 10);
        // let targetStudentSem = sem; // default same
        // if (!isNaN(workSemNum) && workSemNum > 1) {
        //     targetStudentSem = workSemNum - 1;
        // } else if (!isNaN(workSemNum) && workSemNum === 1) {
        //     // If workload is sem 1, assume new students are sem 1? or 0? 
        //     // Usually sem 1 workload maps to sem 1 students.
        //     targetStudentSem = 1;
        // }
        // // --- PROMOTION LOGIC END ---

        // Split by '/' to handle multiple programs like "19B/23B"
        const pCodes = String(pCodeRaw).split('/').map(s => s.trim()).filter(Boolean);

        let aggregatedStudents = [];
        let sourceUsed = 'none';

        if (pCodes.length > 0) {
            // Try to find students for EACH program code + TARGET semester
            pCodes.forEach(code => {
                const key = `${code}_${sem}`;
                const students = studentsMap[key];
                if (students && students.length > 0) {
                    aggregatedStudents = aggregatedStudents.concat(students);
                    sourceUsed = 'strict';
                }
            });
        }

        // FALLBACK: If strict match fails for ALL programs, try mapping by TARGET semester only
        if (aggregatedStudents.length === 0 && sem) {
            const semKey = String(sem);
            aggregatedStudents = studentsBySemester[semKey] || [];
            if (aggregatedStudents.length > 0) sourceUsed = 'fallback';
        }

        if (aggregatedStudents.length > 0) {
            aggregatedStudents.forEach(student => {
                const row = {
                    year: workload.year,
                    program: workload.program,
                    programcode: workload.programcode, // Keeps "19B/23B"
                    course: workload.course,
                    coursecode: workload.coursecode,
                    student: student.name,
                    regno: student.regno,
                    learning: 'Regular',
                    gender: student.gender,
                    classgroup: student.section || 'A',
                    coursetype: workload.type,
                    semester: workload.semester, // Workload semester
                    active: 'Yes',
                    status: 'Active',
                    user: workload.user, // Faculty Email
                    colid: workload.colid,
                    name: workload.name // Faculty Name
                };
                outputData.push(row);
            });
        }
    });

    console.log(`Generated ${outputData.length} enrollment records.`);

    // 4. Write to Output File
    const newWb = XLSX.utils.book_new();
    const newWs = XLSX.utils.json_to_sheet(outputData);
    XLSX.utils.book_append_sheet(newWb, newWs, "ClassEnrollment");
    XLSX.writeFile(newWb, OUTPUT_FILE);
    console.log(`Successfully wrote to ${OUTPUT_FILE}`);
};

mapData();
