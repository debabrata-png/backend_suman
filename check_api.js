const colid = 3052;
const semester = 'XI';
const academicyear = '2025-26';
const section = 'HUMANITIES';
const term = 'unit';

const url = `http://localhost:3000/api/v2/getstudentsandsubjectsformarks11ds?colid=${colid}&semester=${semester}&academicyear=${academicyear}&section=${section}&term=${term}`;

fetch(url)
  .then(res => res.json())
  .then(data => {
    console.log("Success:", data.success);
    console.log("Students count:", data.students ? data.students.length : 0);
    console.log("Subjects count:", data.subjects ? data.subjects.length : 0);
    console.log("Marks count:", data.marks ? data.marks.length : 0);
    if (data.marks && data.marks.length > 0) {
        console.log("First mark:", data.marks[0]);
    }
  })
  .catch(err => {
    console.error("Error calling API:", err);
  });
