const fetch = require('node-fetch'); // wait, built-in fetch in Node 18+

const colid = 3052;
const semester = 'XI';
const academicyear = '2025-26';
const section = 'HUMANITIES';

const url = `http://localhost:3000/api/v2/getstudentsandsubjectsformarks11ds?colid=${colid}&semester=${semester}&academicyear=${academicyear}&section=${section}&term=unit`;

fetch(url)
  .then(res => res.json())
  .then(async data => {
    const students = data.students || [];
    if(students.length === 0) {
        console.log("No students");
        return;
    }
    const regnos = students.map(s => s.regno).join(',');
    
    // We can't directly query all marks via API without parameters, let's write a mongoose script!
    // But we can't connect to mongo securely from here...
    // Let's create a temporary route in app.js or studentmarks11ctlrds.js to dump marks?
    console.log("Students regnos:", regnos);
  });
