const StudentMarks11ds = require('../Models/studentmarks11ds');
const SubjectComponentConfig11ds = require('../Models/subjectcomponentconfig11ds');
const User = require('../Models/user');
const CoScholasticActivity9ds = require('../Models/CoScholasticActivity9ds');
const CoScholasticGrade9ds = require('../Models/CoScholasticGrade9ds');

// Helper to calculate grade (generic)
function calculateGrade(obtained, max) {
    if (max === 0 || max === null || max === undefined) return '-';
    if (!obtained && obtained !== 0) return 'E';
    // Round to 2 decimals to avoid floating-point issues (e.g. 32.999 vs 33.0)
    const percentage = Math.round((obtained / max) * 10000) / 100;
    if (percentage >= 91) return 'A1';
    if (percentage >= 81) return 'A2';
    if (percentage >= 71) return 'B1';
    if (percentage >= 61) return 'B2';
    if (percentage >= 51) return 'C1';
    if (percentage >= 41) return 'C2';
    if (percentage >= 33) return 'D';
    return 'E';
}

function toRoman(num) {
    if (!num || isNaN(num) || num === '-') return num;
    const lookup = { M: 1000, CM: 900, D: 500, CD: 400, C: 100, XC: 90, L: 50, XL: 40, X: 10, IX: 9, V: 5, IV: 4, I: 1 };
    let roman = '';
    for (let i in lookup) {
        while (num >= lookup[i]) {
            roman += i;
            num -= lookup[i];
        }
    }
    return roman;
}

// 1. Get Subjects from Config
exports.getsubjectsfromconfig11ds = async (req, res) => {
    try {
        const { colid, semester, academicyear, section } = req.query;
        const query = {
            colid: Number(colid),
            semester,
            academicyear,
            isactive: true
        };
        // Filter by section if provided — differentiates streams for Class 11/12
        if (section) query.section = section;
        const subjects = await SubjectComponentConfig11ds.find(query).sort({ createdAt: 1 });
        res.json({ success: true, data: subjects });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 1.5 Save Subject Config
exports.saveSubjectConfig11ds = async (req, res) => {
    try {
        const { id, colid, subjectcode, subjectname, semester, academicyear } = req.body;

        let config;
        if (id) {
            config = await SubjectComponentConfig11ds.findByIdAndUpdate(id, req.body, { new: true });
        } else {
            // Check duplicate
            const existing = await SubjectComponentConfig11ds.findOne({ colid, subjectcode, semester, academicyear });
            if (existing) return res.status(400).json({ success: false, message: "Subject Code already exists for this term" });

            config = new SubjectComponentConfig11ds(req.body);
            await config.save();
        }
        res.json({ success: true, message: "Saved successfully", data: config });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. Get Students and Subjects for Entry Grid
// 2. Get Students and Subjects for Entry Grid
exports.getstudentsandsubjectsformarks11ds = async (req, res) => {
    try {
        const { colid, academicyear, section, term } = req.query;
        let { semester } = req.query;

        const querySemester = semester;

        // Fetch Students
        const studentQuery = {
            colid: Number(colid),
            semester: querySemester,
            role: 'Student'
        };
        if (section) studentQuery.section = section;

        // Add Search criteria
        const { search } = req.query;
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            studentQuery.$or = [
                { name: searchRegex },
                { regno: searchRegex },
                { rollno: searchRegex }
            ];
        }

        const students = await User.find(studentQuery)
            .select('regno name rollno')
            .sort({ rollno: 1, name: 1 });

        let subjects = [];
        let marks = [];

        // Check if it's attendance
        if (term === 'attendance') {
            subjects = [{
                subjectcode: 'ATTENDANCE',
                subjectname: 'Attendance',
                maxmarks: 500
            }];

            marks = await StudentMarks11ds.find({
                colid: Number(colid),
                semester,
                academicyear,
                subjectcode: 'ATTENDANCE'
            }).select('regno subjectcode term1totalpresentdays term1totalworkingdays term2totalpresentdays term2totalworkingdays isabsent teacherremarks colid semester academicyear promotedclass newsessiondate');

        } else {
            // Fetch Configured Subjects — filter by section to get stream-specific subjects
            const subjectQuery = {
                colid: Number(colid),
                semester,
                academicyear,
                isactive: true
            };
            if (section) subjectQuery.section = section;

            subjects = await SubjectComponentConfig11ds.find(subjectQuery).sort({ createdAt: 1 });

            // Fallback: if no configs found with section, try without section filter (backward compat)
            if (subjects.length === 0 && section) {
                delete subjectQuery.section;
                subjects = await SubjectComponentConfig11ds.find(subjectQuery).sort({ createdAt: 1 });
            }


            // Fetch Existing Marks to populate the grid
            marks = await StudentMarks11ds.find({
                colid: Number(colid), semester, academicyear, regno: { $in: students.map(s => s.regno) }
            }, {
                regno: 1, subjectcode: 1, colid: 1, semester: 1, academicyear: 1,
                unitpremidobtain: 1, unitpostmidobtain: 1,
                halfyearlythobtain: 1, halfyearlypracticalobtain: 1,
                annualthobtain: 1, annualpracticalobtain: 1,
                term1totalpresentdays: 1, term2totalpresentdays: 1,
                isgrace: 1,
                unitpremidabsent: 1, unitpostmidabsent: 1,
                halfyearlythabsent: 1, halfyearlypracticalabsent: 1,
                annualthabsent: 1, annualpracticalabsent: 1,
                teacherremarks: 1, promotedclass: 1, newsessiondate: 1
            });
        }

        res.json({ success: true, students, subjects, marks });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 3. Save Marks
exports.savemarks11ds = async (req, res) => {
    try {
        const { marksData } = req.body; // Array of marks objects

        if (!marksData || !Array.isArray(marksData)) {
            return res.status(400).json({ success: false, message: "Invalid data format" });
        }

        const bulkOps = marksData.map(mark => {
            // Check if it's attendance
            if (mark.subjectcode === 'ATTENDANCE') {
                const updateFields = {
                    name: mark.name, // marks entry usually has student name/user details
                    user: mark.user,
                    studentname: mark.studentname,
                    subjectname: 'Attendance',
                    updatedat: new Date()
                };

                // Add specific attendance fields if present
                if (mark.term1totalpresentdays !== undefined) updateFields.term1totalpresentdays = mark.term1totalpresentdays;
                if (mark.term1totalworkingdays !== undefined) updateFields.term1totalworkingdays = mark.term1totalworkingdays;
                if (mark.term2totalpresentdays !== undefined) updateFields.term2totalpresentdays = mark.term2totalpresentdays;
                if (mark.term2totalworkingdays !== undefined) updateFields.term2totalworkingdays = mark.term2totalworkingdays;
                updateFields.teacherremarks = mark.teacherremarks || '';
                updateFields.promotedclass = mark.promotedclass || '';
                updateFields.newsessiondate = mark.newsessiondate || '';

                return {
                    updateOne: {
                        filter: {
                            colid: mark.colid,
                            regno: mark.regno,
                            subjectcode: 'ATTENDANCE',
                            semester: mark.semester,
                            academicyear: mark.academicyear
                        },
                        update: {
                            $set: updateFields,
                            $setOnInsert: { createdat: new Date() }
                        },
                        upsert: true
                    }
                };
            }

            // Standard Subject Logic
            const preMid = (mark.unitpremidobtain !== undefined && mark.unitpremidobtain !== null && mark.unitpremidobtain !== '') ? Number(mark.unitpremidobtain) : 0;
            const postMid = (mark.unitpostmidobtain !== undefined && mark.unitpostmidobtain !== null && mark.unitpostmidobtain !== '') ? Number(mark.unitpostmidobtain) : 0;
            const unitTotalRaw = preMid + postMid;
            const unit20 = Number((unitTotalRaw * 0.2).toFixed(2));

            const hyTh = (mark.halfyearlythobtain !== undefined && mark.halfyearlythobtain !== null && mark.halfyearlythobtain !== '') ? Number(mark.halfyearlythobtain) : 0;
            const hyPr = (mark.halfyearlypracticalobtain !== undefined && mark.halfyearlypracticalobtain !== null && mark.halfyearlypracticalobtain !== '') ? Number(mark.halfyearlypracticalobtain) : 0;
            const hyTotalRaw = hyTh + hyPr;
            const halfyearly30 = Number((hyTotalRaw * 0.3).toFixed(2));

            const annTh = (mark.annualthobtain !== undefined && mark.annualthobtain !== null && mark.annualthobtain !== '') ? Number(mark.annualthobtain) : 0;
            const annPr = (mark.annualpracticalobtain !== undefined && mark.annualpracticalobtain !== null && mark.annualpracticalobtain !== '') ? Number(mark.annualpracticalobtain) : 0;
            const annTotalRaw = annTh + annPr;
            const annual50 = Number((annTotalRaw * 0.5).toFixed(2));

            const total = Number((unit20 + halfyearly30 + annual50).toFixed(2));
            const totalgrade = calculateGrade(total, 100);

            return {
                updateOne: {
                    filter: {
                        colid: mark.colid,
                        regno: mark.regno,
                        subjectcode: mark.subjectcode,
                        semester: mark.semester,
                        academicyear: mark.academicyear
                    },
                    update: {
                        $set: {
                            name: mark.name,
                            user: mark.user,
                            studentname: mark.studentname,
                            subjectname: mark.subjectname,

                            unitpremidobtain: preMid,
                            unitpostmidobtain: postMid,
                            unittotal: unitTotalRaw,
                            unit20: unit20,

                            halfyearlythobtain: hyTh,
                            halfyearlypracticalobtain: hyPr,
                            halfyearlytotal: hyTotalRaw,
                            halfyearly30: halfyearly30,

                            annualthobtain: annTh,
                            annualpracticalobtain: annPr,
                            annualtotal: annTotalRaw,
                            annual50: annual50,

                            total: total,
                            totalgrade: totalgrade,
                            isgrace: mark.isgrace || false,
                            isabsent: !!(mark.unitpremidabsent || mark.unitpostmidabsent || mark.halfyearlythabsent || mark.halfyearlypracticalabsent || mark.annualthabsent || mark.annualpracticalabsent), // Overall absent flag (legacy)
                            teacherremarks: mark.teacherremarks || '',
                            promotedclass: mark.promotedclass || '',
                            newsessiondate: mark.newsessiondate || '',

                            // Correctly map individual absent flags based on input
                            unitpremidabsent: mark.unitpremidabsent || false,
                            unitpostmidabsent: mark.unitpostmidabsent || false,
                            halfyearlythabsent: mark.halfyearlythabsent || false,
                            halfyearlypracticalabsent: mark.halfyearlypracticalabsent || false,
                            annualthabsent: mark.annualthabsent || false,
                            annualpracticalabsent: mark.annualpracticalabsent || false,

                            status: 'finalized',
                            updatedat: new Date()
                        },
                        $setOnInsert: { createdat: new Date() }
                    },
                    upsert: true
                }
            };
        });

        await StudentMarks11ds.bulkWrite(bulkOps);
        res.json({ success: true, message: "Marks saved successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 4. Get Data for PDF
exports.getMarksheetPDFData11ds = async (req, res) => {
    try {
        const { regno, colid, semester, academicyear } = req.query;

        // Fetch Student
        const student = await User.findOne({
            regno,
            colid: Number(colid)
        });

        if (!student) return res.status(404).json({ success: false, message: "Student not found" });

        // Fetch Marks (including ATTENDANCE)
        const marks = await StudentMarks11ds.find({
            regno,
            colid: Number(colid),
            semester,
            academicyear
        }).sort({ createdAt: 1 });

        // Extract Attendance, Remarks and a Fallback record for remarks/promotion
        const attRecord = marks.find(m => m.subjectcode === 'ATTENDANCE');
        const remarksRecord = marks.find(m => m.subjectcode === 'REMARKS');
        const fallbackRecord = marks.find(m => m.subjectcode !== 'ATTENDANCE' && m.subjectcode !== 'REMARKS') || {};

        // Filter out attendance and remarks from subjects list for display/calculation
        const subjectMarks = marks.filter(m => m.subjectcode !== 'ATTENDANCE' && m.subjectcode !== 'REMARKS');

        // Fetch Subject Configs — use student's section to get stream-specific subjects
        const subjectCodes = subjectMarks.map(m => m.subjectcode);
        const subjectConfigs = await SubjectComponentConfig11ds.find({
            colid: Number(colid),
            semester,
            academicyear,
            section: student.section || '',
            subjectcode: { $in: subjectCodes }
        });
        // Fallback: if no configs found with section, try without section filter (backward compat)
        let finalSubjectConfigs = subjectConfigs;
        if (finalSubjectConfigs.length === 0) {
            finalSubjectConfigs = await SubjectComponentConfig11ds.find({
                colid: Number(colid),
                semester,
                academicyear,
                subjectcode: { $in: subjectCodes }
            });
        }

        //console.log("DEBUG: Looking for subjects:", subjectCodes);
        //console.log("DEBUG: Found configs:", subjectConfigs.length);
        //subjectConfigs.forEach(sc => console.log(`DEBUG: Config Code: ${sc.subjectcode}, Name: ${sc.subjectname}`));


        const codeToNameMap = {};
        const codeToAdditionalMap = {};
        const codeToCompulsoryMap = {};
        finalSubjectConfigs.forEach(sc => {
            codeToNameMap[sc.subjectcode] = sc.subjectname;
            codeToAdditionalMap[sc.subjectcode] = sc.isadditional || false;
            codeToCompulsoryMap[sc.subjectcode] = sc.iscompulsory || false;
        });

        // Only include subjects that are configured for this student's section/stream.
        // This prevents other-stream subjects from appearing in the report card.
        const validSubjectCodes = new Set(finalSubjectConfigs.map(sc => sc.subjectcode));
        const filteredSubjectMarks = validSubjectCodes.size > 0
            ? subjectMarks.filter(m => validSubjectCodes.has(m.subjectcode))
            : subjectMarks; // Fallback: show all if config is empty (backward compat)

        let grandTotal = 0;
        let maxTotal = 0;
        let failCount = 0;

        const subjectsFormatted = filteredSubjectMarks
            .map(m => {
                // A subject has marks if total is > 0 OR if any individual component has been entered (is > 0)
                const hasMarks = (m.total > 0) ||
                    (m.unitpremidobtain > 0) ||
                    (m.unitpostmidobtain > 0) ||
                    (m.halfyearlythobtain > 0) ||
                    (m.halfyearlypracticalobtain > 0) ||
                    (m.annualthobtain > 0) ||
                    (m.annualpracticalobtain > 0) ||
                    m.unitpremidabsent === true || m.unitpostmidabsent === true ||
                    m.halfyearlythabsent === true || m.halfyearlypracticalabsent === true ||
                    m.annualthabsent === true || m.annualpracticalabsent === true;

                // Use Config Name if available, else fallback to Marks Name
                let realSubjectName = codeToNameMap[m.subjectcode] || m.subjectname;

                // INTELLIGENT FIX: Check if the mapping inverted the Name/Code (User data issue)
                const isResultCodeLike = /\d/.test(realSubjectName);
                const isInputNameLike = !/\d/.test(m.subjectcode) && m.subjectcode.length > 2;

                if (isResultCodeLike && isInputNameLike) {
                    realSubjectName = m.subjectcode;
                }

                return {
                    subjectname: realSubjectName,
                    subjectcode: m.subjectcode,
                    unitpremid: m.unitpremidobtain,
                    unitpostmid: m.unitpostmidobtain,
                    unitTotal: m.unittotal,
                    unit20: m.unit20,

                    hyTh: m.halfyearlythobtain,
                    hyPr: m.halfyearlypracticalobtain,
                    hyTotal: m.halfyearlytotal,
                    hy30: m.halfyearly30,

                    annTh: m.annualthobtain,
                    annPr: m.annualpracticalobtain,
                    annTotal: m.annualtotal,
                    ann50: m.annual50,

                    grandTotal: m.total,
                    grade: m.totalgrade,
                    isgrace: m.isgrace || false,
                    isabsent: m.isabsent || false,
                    unitpremidabsent: m.unitpremidabsent || false,
                    unitpostmidabsent: m.unitpostmidabsent || false,
                    halfyearlythabsent: m.halfyearlythabsent || false,
                    halfyearlypracticalabsent: m.halfyearlypracticalabsent || false,
                    annualthabsent: m.annualthabsent || false,
                    annualpracticalabsent: m.annualpracticalabsent || false,
                    compartmentobtained: (m.compartmentobtained !== undefined && m.compartmentobtained !== null)
                        ? m.compartmentobtained : null,
                    hasMarks: hasMarks,
                    isAdditional: codeToAdditionalMap[m.subjectcode] || false,
                    isCompulsory: codeToCompulsoryMap[m.subjectcode] || false
                };
            })
            .filter(s => s.hasMarks);

        // Determine top 5 subjects (Protect Compulsory) — subjects beyond top 5 are "additional"
        if (subjectsFormatted.length > 5) {
            const compulsory = subjectsFormatted.filter(s => s.isCompulsory);
            const others = subjectsFormatted.filter(s => !s.isCompulsory);

            others.sort((a, b) => (b.grandTotal || 0) - (a.grandTotal || 0));

            const top5Codes = new Set(compulsory.slice(0, 5).map(s => s.subjectcode));
            for (const s of others) {
                if (top5Codes.size >= 5) break;
                top5Codes.add(s.subjectcode);
            }

            subjectsFormatted.forEach(s => {
                s.isAdditional = !top5Codes.has(s.subjectcode);
            });
        }

        // Calculate totals using only top 5 subjects
        subjectsFormatted.forEach(s => {
            if (!s.isAdditional) {
                grandTotal += (s.grandTotal || 0);
                maxTotal += 100;
                if ((s.grandTotal || 0) < 33) failCount++;
            }
        });

        const percentage = maxTotal > 0 ? ((grandTotal / maxTotal) * 100).toFixed(2) : 0;
        const resultStatus = failCount === 0 ? "PASSED" : (failCount === 1 ? "COMPARTMENT" : "FAILED");

        // Build compartmentSubjects list — only from top 5 subjects
        const compartmentSubjects = subjectsFormatted
            .filter(s => !s.isAdditional && ((s.grandTotal || 0) < 33 || s.grade === 'E'))
            .map(s => ({
                subjectname: s.subjectname,
                finalScore: s.grandTotal || 0,
                compartmentobtained: s.compartmentobtained
            }));

        // Fetch Co-Scholastic data
        let finalCoScholastic = [];
        try {
            const coActivities = await CoScholasticActivity9ds.find({
                colid: Number(colid),
                semester: semester,
                academicyear: academicyear,
                isactive: true
            });

            const coActivityIds = coActivities.map(act => act._id);

            const coGrades = await CoScholasticGrade9ds.find({
                colid: Number(colid),
                regno,
                semester,
                academicyear,
                activityid: { $in: coActivityIds }
            }).sort({ createdAt: -1 });

            // Create a lookup for grades
            const gradeMap = {};
            coGrades.forEach(g => {
                const actId = g.activityid.toString();
                if (!gradeMap[actId]) gradeMap[actId] = g;
            });

            // Format for frontend
            finalCoScholastic = coActivities.map(act => {
                const gradeData = gradeMap[act._id.toString()] || {};
                return {
                    id: act._id,
                    code: act.code || '',
                    area: act.name || act.activityname || '',
                    grade: gradeData.term1grade || gradeData.grade || '-',
                };
            });
        } catch (e) {
            console.error("Co-Scholastic fetch error:", e);
        }

        // Dynamic Rank Calculation — CLASS-WISE (no section filter)
        const classStudents = await User.find({
            colid: Number(colid),
            semester: semester,
            admissionyear: academicyear,
            role: 'Student'
        }).lean();

        const classRegNos = classStudents.map(s => s.regno);

        // Fetch all marks for the batch (class-wide)
        const allBatchMarks = await StudentMarks11ds.find({
            colid: Number(colid),
            semester,
            academicyear,
            subjectcode: { $nin: ['ATTENDANCE', 'REMARKS'] },
            regno: { $in: classRegNos }
        }).lean();

        // Group by student: collect per-subject totals and grades
        const studentSubjects = {};
        allBatchMarks.forEach(m => {
            const hasMarks = [
                m.unitpremidobtain, m.unitpostmidobtain, m.unittotal, m.unit20,
                m.halfyearlythobtain, m.halfyearlypracticalobtain, m.halfyearlytotal, m.halfyearly30,
                m.annualthobtain, m.annualpracticalobtain, m.annualtotal, m.annual50
            ].some(val => val !== null && val !== undefined && val !== '') ||
                [
                    m.unitpremidabsent, m.unitpostmidabsent,
                    m.halfyearlythabsent, m.halfyearlypracticalabsent,
                    m.annualthabsent, m.annualpracticalabsent
                ].some(abs => abs === true || abs === 'true');

            if (hasMarks) {
                if (!studentSubjects[m.regno]) studentSubjects[m.regno] = [];
                studentSubjects[m.regno].push({ total: m.total || 0, grade: m.totalgrade });
            }
        });

        // Calculate rank using top 5 subjects by score, percentage-based with dense ranking
        const sortedRanks = Object.keys(studentSubjects).map(r => {
            const subs = studentSubjects[r];
            // Sort subjects descending by total, take top 5
            const sorted = subs.sort((a, b) => b.total - a.total);
            const top5 = sorted.slice(0, 5);
            const top5Total = top5.reduce((sum, s) => sum + s.total, 0);
            const top5Max = top5.length * 100;
            const pct = parseFloat(((top5Max > 0 ? (top5Total / top5Max) * 100 : 0)).toFixed(2));
            // E-grade check: any of top 5 subjects has grade E
            const hasE = top5.some(s => s.grade === 'E' || s.grade === 'E1' || s.grade === 'E2' || s.grade === 'E (Needs improvement)');
            return { regno: r, percentage: pct, hasE };
        })
            .filter(s => !s.hasE) // Remove failed students from global ranking
            .sort((a, b) => b.percentage - a.percentage);

        // Dense ranking: equal percentages get equal rank
        let currentRank = 1;
        for (let i = 0; i < sortedRanks.length; i++) {
            if (i > 0 && sortedRanks[i].percentage.toFixed(2) !== sortedRanks[i - 1].percentage.toFixed(2)) {
                currentRank++;
            }
            sortedRanks[i].rank = currentRank;
        }

        const myRankEntry = sortedRanks.find(s => s.regno === regno);
        const myFullData = Object.keys(studentSubjects).map(r => {
            const subs = studentSubjects[r];
            const sorted = subs.sort((a, b) => b.total - a.total);
            const top5 = sorted.slice(0, 5);
            const hasE = top5.some(s => s.grade === 'E' || s.grade === 'E1' || s.grade === 'E2' || s.grade === 'E (Needs improvement)');
            return { regno: r, hasE };
        }).find(s => s.regno === regno);

        let rank = (myRankEntry && (!myFullData || !myFullData.hasE)) ? toRoman(myRankEntry.rank) : '-';

        const pdfData = {
            profile: {
                name: student.name,
                regno: student.regno,
                rollno: student.rollno,
                class: `${semester} - ${student.section || ''}`,
                father: student.fathername,
                mother: student.mothername,
                dob: student.dob,
                address: student.address,
                phone: student.phone,
                contact: student.phone,
                cbseRegNo: student.cbseno || '',   // CBSE Registration Number from User table
                photo: student.photo,

                // Attendance Data from Marks Collection
                term1attendance: attRecord ? (attRecord.term1totalpresentdays || 0) : 0,
                term1workingdays: attRecord ? (attRecord.term1totalworkingdays || 0) : 0,
                term2attendance: attRecord ? (attRecord.term2totalpresentdays || 0) : 0,
                term2workingdays: attRecord ? (attRecord.term2totalworkingdays || 0) : 0
            },
            subjects: subjectsFormatted,
            coScholastic: finalCoScholastic, // Pass CoScholastic to frontend
            grandTotal,
            maxTotal,
            percentage,
            result: resultStatus,
            rank: rank,
            failCount,
            compartmentSubjects,
            remarks: remarksRecord ? remarksRecord.teacherremarks : (attRecord && attRecord.teacherremarks ? attRecord.teacherremarks : (fallbackRecord.teacherremarks || '')),
            promotedToClass: remarksRecord ? remarksRecord.promotedclass : (attRecord && attRecord.promotedclass ? attRecord.promotedclass : (fallbackRecord.promotedclass || '')),
            newSessionDate: remarksRecord ? remarksRecord.newsessiondate : (attRecord && attRecord.newsessiondate ? attRecord.newsessiondate : (fallbackRecord.newsessiondate || ''))
        };


        res.json({ success: true, data: pdfData });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
// Save Subject Component Config 11ds
exports.saveSubjectComponentConfig11ds = async (req, res) => {
    try {
        const { id, colid, user, subjectcode, subjectname, semester, academicyear, unitpremid, unitpostmid, halfyearlyth, halfyearlypractical, annualth, annualpractical, isadditional, iscompulsory } = req.body;

        const updateData = {
            colid: Number(colid),
            user,
            subjectcode,
            subjectname,
            semester,
            academicyear,
            section: req.body.section || '',  // section/stream field
            unitpremid,
            unitpostmid,
            halfyearlyth,
            halfyearlypractical,
            annualth,
            annualpractical,
            isadditional,
            iscompulsory,
            updatedat: new Date()
        };

        if (req.body.name) updateData.name = req.body.name; // subjectname map

        const filter = id ? { _id: id } : {
            colid: Number(colid),
            subjectcode: subjectcode,
            semester: semester,
            academicyear: academicyear,
            section: req.body.section || ''
        };

        const options = { upsert: true, new: true, setDefaultsOnInsert: true };

        const result = await SubjectComponentConfig11ds.findOneAndUpdate(filter, updateData, options);

        res.json({
            success: true,
            message: 'Subject configuration saved successfully',
            data: result
        });
    } catch (error) {
        console.error('Error in saveSubjectComponentConfig11ds:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save subject configuration',
            error: error.message
        });
    }
};

// Start of getMarksheetPDFData11ds (existing) or End of file

exports.getrankreportds = async (req, res) => {
    try {
        const { colid, academicyear, semester, section } = req.query;

        // Validation
        if (!colid || !academicyear || !semester) {
            return res.status(400).json({ success: false, message: "Missing required parameters." });
        }

        // 1. Fetch Students CLASS-WIDE (no section filter for ranking)
        const studentQuery = {
            colid: Number(colid),
            admissionyear: academicyear,
            semester,
            role: 'Student'
        };
        // If section is passed, still use it for filtering the display list,
        // but ranking is calculated across all sections
        const students = await User.find(studentQuery).lean();

        if (students.length === 0) {
            return res.json({ success: true, data: [] });
        }

        const studentMap = {};
        const regNos = students.map(s => {
            studentMap[s.regno] = s;
            return s.regno;
        });

        // 2. Fetch marks — exclude both ATTENDANCE and REMARKS
        let allMarks = [];
        const semLower = semester.toLowerCase();
        const excludeSubjects = ['ATTENDANCE', 'REMARKS'];
        let configMap = {}; // CRITICAL: Initialize configMap

        if (semLower.includes("11") || semLower.includes("12")) {
            allMarks = await StudentMarks11ds.find({
                colid: Number(colid),
                academicyear,
                semester: querySemester,
                regno: { $in: regNos },
                subjectcode: { $nin: excludeSubjects }
            }).lean();

            // Fetch subject configs for Class 11/12 to get iscompulsory
            const configs = await SubjectComponentConfig11ds.find({
                colid: Number(colid),
                semester: querySemester,
                academicyear,
                isactive: true
            }).lean();
            configs.forEach(cfg => {
                configMap[cfg.subjectcode] = cfg;
            });
        } else {
            const StudentMarks9ds = require('../Models/studentmarks9ds');
            allMarks = await StudentMarks9ds.find({
                colid: Number(colid),
                academicyear,
                semester: querySemester,
                regno: { $in: regNos },
                subjectcode: { $nin: excludeSubjects }
            }).lean();
        }

        // 2.5 Fetch subject configs for all classes (if not already fetched for 11/12)
        if (Object.keys(configMap).length === 0) {
            const semLower = semester.toLowerCase();
            let ConfigModel;
            if (semLower.includes("11") || semLower.includes("12")) {
                ConfigModel = SubjectComponentConfig11ds;
            } else {
                ConfigModel = require('../Models/subjectcomponentconfig9ds');
            }
            const configs = await ConfigModel.find({
                colid: Number(colid),
                semester: querySemester,
                academicyear,
                isactive: true
            }).lean();
            configs.forEach(cfg => {
                configMap[cfg.subjectcode] = cfg;
            });
        }

        // 3. Group Marks by Regno — collect per-subject data for top-5 ranking
        const studentSubjectsMap = {};

        allMarks.forEach(m => {
            const rNo = m.regno;

            if (semLower.includes("11") || semLower.includes("12")) {
                // Class 11-12: check if subject has marks
                const hasMarks = [
                    m.unitpremidobtain, m.unitpostmidobtain,
                    m.halfyearlythobtain, m.halfyearlypracticalobtain,
                    m.annualthobtain, m.annualpracticalobtain
                ].some(val => val !== null && val !== undefined && val !== '' && val > 0) ||
                    [
                        m.unitpremidabsent, m.unitpostmidabsent,
                        m.halfyearlythabsent, m.halfyearlypracticalabsent,
                        m.annualthabsent, m.annualpracticalabsent
                    ].some(abs => abs === true || abs === 'true');

                if (hasMarks) {
                    // Rule: If marks is 0, do not take in calculation for 9-12
                    if (m.total === 0) return null;

                    if (!studentSubjectsMap[rNo]) studentSubjectsMap[rNo] = [];
                    const conf11 = configMap[m.subjectcode] || {};
                    studentSubjectsMap[rNo].push({
                        total: m.total || 0,
                        grade: m.totalgrade,
                        isCompulsory: conf11.iscompulsory || false
                    });
                }
            } else {
                // Class KG-10: check if subject has marks
                const hasMarks = [
                    m.term1periodictestobtained, m.term1notebookobtained,
                    m.term1enrichmentobtained, m.term1midexamobtained,
                    m.term2periodictestobtained, m.term2notebookobtained,
                    m.term2enrichmentobtained, m.term2annualexamobtained
                ].some(val => val !== null && val !== undefined && val !== '' && val > 0) ||
                    [
                        m.term1periodictestabsent, m.term1midexamabsent,
                        m.term2periodictestabsent, m.term2annualexamabsent
                    ].some(abs => abs === true || abs === 'true');

                if (hasMarks) {
                    if (!studentSubjectsMap[rNo]) studentSubjectsMap[rNo] = [];

                    // Apply same PT scaling as report card
                    const conf = configMap[m.subjectcode] || {};
                    const t1PTMax = conf.term1periodictestmax || 40;
                    const t1PTObt = m.term1periodictestobtained || 0;
                    const t1PTScaled = t1PTMax > 0 ? (t1PTObt / t1PTMax) * 10 : 0;

                    const t2PTMax = conf.term2periodictestmax || 40;
                    const t2PTObt = m.term2periodictestobtained || 0;
                    const t2PTScaled = t2PTMax > 0 ? (t2PTObt / t2PTMax) * 10 : 0;

                    const t1Raw = t1PTScaled + (m.term1notebookobtained || 0) + (m.term1enrichmentobtained || 0) + (m.term1midexamobtained || 0);
                    const t2Raw = t2PTScaled + (m.term2notebookobtained || 0) + (m.term2enrichmentobtained || 0) + (m.term2annualexamobtained || 0);

                    // Weighted 50-50
                    const subTotal = parseFloat(((t1Raw * 0.5) + (t2Raw * 0.5)).toFixed(2));

                    // Rule: If marks is 0 in Term II, do not take in calculation for 9-12
                    if (t2Raw === 0) return null;

                    // Use Term 2 for E-grade check in Class 6-10
                    const t2NBMax = conf.term2notebookmax || 5;
                    const t2ENMax = conf.term2enrichmentmax || 5;
                    const t2MEMax = conf.term2annualexammax || 80;
                    const term2MaxTotal = 10 + t2NBMax + t2ENMax + t2MEMax;
                    const isFail = t2Raw < (term2MaxTotal * 0.33);

                    studentSubjectsMap[rNo].push({
                        total: subTotal,
                        grade: isFail ? 'E' : 'PASS', // Use E to trigger noRank
                        isCompulsory: conf.iscompulsory || false,
                        isAdditional: conf.isadditional || false
                    });
                }
            }
        });

        // 4. Calculate Ranks — Class Tier Logic
        const semUpper = semester.toString().toUpperCase();
        const isKG = semUpper.includes("NURSERY") || semUpper.includes("LKG") || semUpper.includes("UKG") || semUpper.includes("KG");
        const isTop5Class = semUpper.includes("IX") || semUpper.includes("9") || semUpper.includes("X") || semUpper.includes("10") || semUpper.includes("XI") || semUpper.includes("11") || semUpper.includes("XII") || semUpper.includes("12");

        let reportData = students.map(s => {
            const subs = studentSubjectsMap[s.regno] || [];
            let targetSubjects = [];
            let hasFail = false;

            if (isTop5Class) {
                // Select Top 5 protecting Compulsory
                const compulsory = subs.filter(sub => sub.isCompulsory);
                const elective = subs.filter(sub => !sub.isCompulsory);
                elective.sort((a, b) => b.total - a.total);

                const top5Set = new Set(compulsory.slice(0, 5));
                for (const e of elective) {
                    if (top5Set.size >= 5) break;
                    top5Set.add(e);
                }
                targetSubjects = Array.from(top5Set);
                // Fail if any top 5 has E in Term II
                hasFail = targetSubjects.some(sub => sub.grade === 'E');
            } else if (isKG) {
                // All non-additional, no failure skip for KG
                targetSubjects = subs.filter(sub => !sub.isAdditional);
                hasFail = false;
            } else {
                // Classes 1-8: All non-additional, skip if any has E in Term II
                targetSubjects = subs.filter(sub => !sub.isAdditional);
                hasFail = targetSubjects.some(sub => sub.grade === 'E');
            }

            const total = targetSubjects.reduce((sum, sub) => sum + sub.total, 0);
            const max = targetSubjects.length * 100;
            const pct = parseFloat((max > 0 ? (total / max) * 100 : 0).toFixed(2));

            return {
                regno: s.regno,
                rollno: s.rollno || '-',
                name: s.name,
                total: parseFloat(total.toFixed(2)),
                percentage: pct.toFixed(2) + '%',
                pctNum: pct,
                rank: '-',
                hasFail: hasFail
            };
        });

        // Sort descending by percentage
        reportData.sort((a, b) => b.pctNum - a.pctNum);

        // 5. Assign Ranks — seq skip for failing students
        let currentRank = 1;
        let rankableIndex = 0;
        reportData.forEach((row, i) => {
            if (!row.hasFail) {
                if (rankableIndex > 0) {
                    const prevPass = reportData.slice(0, i).filter(r => !r.hasFail).pop();
                    // Robust tie-breaking
                    if (prevPass && Math.round(row.pctNum * 100) !== Math.round(prevPass.pctNum * 100)) {
                        currentRank++;
                    }
                }
                row.rank = toRoman(currentRank);
                rankableIndex++;
            }
        });

        res.json({ success: true, data: reportData });

    } catch (e) {
        console.error("Error in getrankreportds:", e);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
