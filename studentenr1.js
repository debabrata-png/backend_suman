const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const STUDENT_FILES = [
    'SORT_BETC.xlsx',
    'SORT_DIPLOMA.xlsx',
    'SORT_Mtech.xlsx'
];
const WORKLOAD_FILE = 'WORK LOAD SORT.xlsx';
const OUTPUT_FILE = 'classenr_sort_output.xlsx';

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
        const pCode = workload.programcode;
        const sem = workload.semester;

        const key = `${pCode}_${sem}`;
        const matchingStudents = studentsMap[key] || [];

        if (matchingStudents.length > 0) {
            matchingStudents.forEach(student => {
                const row = {
                    year: workload.year,
                    program: workload.program,
                    programcode: workload.programcode,
                    course: workload.course,
                    coursecode: workload.coursecode,
                    student: student.name,
                    regno: student.regno,
                    learning: 'Regular', // Default or derived?
                    gender: student.gender,
                    classgroup: student.section || 'A', // Default to A if missing
                    coursetype: workload.type,
                    semester: workload.semester,
                    active: 'Yes',
                    status: 'Active',
                    // Added fields from Workload as requested
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