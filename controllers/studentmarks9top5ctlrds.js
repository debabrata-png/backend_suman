const StudentMarks9ds = require('../Models/studentmarks9ds');
const SubjectComponentConfig9ds = require('../Models/subjectcomponentconfig9ds');
const User = require('../Models/user');
const CoScholasticActivity9ds = require('../Models/CoScholasticActivity9ds');
const CoScholasticGrade9ds = require('../Models/CoScholasticGrade9ds');
const Attendancenew = require('../Models/attendancenew');

// ============================================================
// Helper: Calculate Grade
// ============================================================
function calculateGrade(obtained, max) {
    if (max === 0 || max === null || max === undefined) return '-';
    if (!obtained && obtained !== 0) return 'E';
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

// ============================================================
// Helper: Convert Number to Roman Numeral
// ============================================================
function toRoman(num) {
    if (!num || isNaN(num) || num === '-') return num;
    const lookup = {
        M: 1000, CM: 900, D: 500, CD: 400,
        C: 100, XC: 90, L: 50, XL: 40,
        X: 10, IX: 9, V: 5, IV: 4, I: 1
    };
    let roman = '';
    for (let i in lookup) {
        while (num >= lookup[i]) {
            roman += i;
            num -= lookup[i];
        }
    }
    return roman;
}

// ============================================================
// Helper: Compute per-student Top-5 normalized scores
// FIX: hasFail checks BOTH individual subject fail AND overall grade
// ============================================================
function computeTop5(sMarks, configMap) {
    const subjectScores = sMarks.map(m => {
        const conf = configMap[m.subjectcode] || {};

        // FIX: Subject must have at least one ACTUAL non-zero obtained mark,
        // OR be legitimately marked absent (absent = intentional zero, not missing data)
        const hasActualMarks = [
            m.term1periodictestobtained, m.term1notebookobtained,
            m.term1enrichmentobtained, m.term1midexamobtained,
            m.term2periodictestobtained, m.term2notebookobtained,
            m.term2enrichmentobtained, m.term2annualexamobtained
        ].some(val => val !== null && val !== undefined && val !== '' && Number(val) > 0);

        const isAbsent = [
            m.term1periodictestabsent, m.term1midexamabsent,
            m.term2periodictestabsent, m.term2annualexamabsent
        ].some(abs => abs === true || abs === 'true');

        // Skip subject entirely — no marks entered and not absent
        if (!hasActualMarks && !isAbsent) return null;

        // ── Term 1 ──────────────────────────────────────────────
        const t1PTMax = conf.term1periodictestmax || 40;
        const t1PTScaled = t1PTMax > 0 ? ((m.term1periodictestobtained || 0) / t1PTMax) * 10 : 0;
        const t1NBMax = conf.term1notebookmax || 5;
        const t1ENMax = conf.term1enrichmentmax || 5;
        const t1MEMax = conf.term1midexammax || 80;
        const t1TotalMax = 10 + t1NBMax + t1ENMax + t1MEMax;
        const t1Raw = t1PTScaled
            + (m.term1notebookobtained || 0)
            + (m.term1enrichmentobtained || 0)
            + (m.term1midexamobtained || 0);

        // ── Term 2 ──────────────────────────────────────────────
        const t2PTMax = conf.term2periodictestmax || 40;
        const t2PTScaled = t2PTMax > 0 ? ((m.term2periodictestobtained || 0) / t2PTMax) * 10 : 0;
        const t2NBMax = conf.term2notebookmax || 5;
        const t2ENMax = conf.term2enrichmentmax || 5;
        const t2MEMax = conf.term2annualexammax || 80;
        const t2TotalMax = 10 + t2NBMax + t2ENMax + t2MEMax;
        const t2Raw = t2PTScaled
            + (m.term2notebookobtained || 0)
            + (m.term2enrichmentobtained || 0)
            + (m.term2annualexamobtained || 0);

        // Normalize each term to 100-scale for fair comparison
        const t1Norm = t1TotalMax > 0 ? (t1Raw / t1TotalMax) * 100 : 0;
        const t2Norm = t2TotalMax > 0 ? (t2Raw / t2TotalMax) * 100 : 0;

        // Combined normalized score (equal weight per term)
        const totalNormalized = parseFloat(((t1Norm * 0.5) + (t2Norm * 0.5)).toFixed(2));

        // FIX: Individual subject fail = Term2 normalized < 33%
        const isFail = t2Norm < 33;

        return {
            total: totalNormalized,
            subjectcode: m.subjectcode,
            isCompulsory: conf.iscompulsory || false,
            isFail: isFail,
            t1Raw,
            t2Raw,
            t1TotalMax,
            t2TotalMax
        };
    }).filter(Boolean);

    if (subjectScores.length === 0) return null;

    // ── Select Top-5 protecting compulsory subjects ──────────
    const compulsory = subjectScores.filter(s => s.isCompulsory);
    const others = subjectScores.filter(s => !s.isCompulsory);
    others.sort((a, b) => b.total - a.total);

    const top5Set = new Set(compulsory.slice(0, 5));
    for (const s of others) {
        if (top5Set.size >= 5) break;
        top5Set.add(s);
    }
    const top5 = Array.from(top5Set);

    const top5Total = top5.reduce((sum, s) => sum + s.total, 0);
    const top5Max = top5.length * 100;
    const pct = parseFloat((top5Max > 0 ? (top5Total / top5Max) * 100 : 0).toFixed(2));

    const overallGrade = calculateGrade(top5Total, top5Max);

    // Rank eligibility depends only on failures inside the selected top 5.
    const hasIndividualFail = top5.some(s => s.isFail);
    const hasFail = hasIndividualFail;

    return { top5, top5Total, top5Max, pct, overallGrade, hasFail };
}

// ============================================================
// Helper: Dense Rank Assignment
// FIX: Tied percentage → same rank (dense ranking, no gaps)
// ============================================================
function assignDenseRanks(studentRankData) {
    // Array must already be sorted descending by percentage
    let currentDenseRank = 1;
    let lastPct = null;

    for (let i = 0; i < studentRankData.length; i++) {
        const s = studentRankData[i];

        if (s.hasFail) {
            s.rankValue = null;
            continue;
        }

        // Multiply by 100 to avoid float precision issues in comparison
        const currentPct = Math.round(s.percentage * 100);

        if (lastPct === null) {
            // First passing student
            s.rankValue = currentDenseRank;
        } else if (currentPct === lastPct) {
            // FIX: Tie → same rank as previous student
            s.rankValue = currentDenseRank;
        } else {
            // Strictly lower percentage → next rank
            currentDenseRank++;
            s.rankValue = currentDenseRank;
        }

        lastPct = currentPct;
    }

    return studentRankData;
}

// ============================================================
// Class 9-10 Marksheet PDF — WITH Top-5 Subject Selection
// ============================================================
exports.getmarksheetpdfdata9top5ds = async (req, res) => {
    try {
        const { regno, colid, academicyear } = req.query;
        let { semester } = req.query;

        const querySemester = semester;

        // ── 1. Fetch Student / User Data ─────────────────────────
        const userData = await User.findOne({ regno, colid: Number(colid) });
        if (!userData) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }

        // ── 2. Fetch Marks Data ──────────────────────────────────
        const allMarksData = await StudentMarks9ds.find({
            regno,
            colid: Number(colid),
            semester: querySemester,
            academicyear
        }).sort({ createdAt: 1 });

        const marksData = allMarksData.filter(m => m.subjectcode !== 'ATTENDANCE' && m.subjectcode !== 'REMARKS');
        const attendanceRecord = allMarksData.find(m => m.subjectcode === 'ATTENDANCE') || {};
        const remarksRecord = allMarksData.find(m => m.subjectcode === 'REMARKS') || {};

        // ── 2.5. Fetch Subject Configs ───────────────────────────
        const allConfigs = await SubjectComponentConfig9ds.find({
            colid: Number(colid),
            semester: querySemester,
            academicyear
        });

        const configMap = {};
        allConfigs.forEach(config => { configMap[config.subjectcode] = config; });

        // Sort marksData by config createdAt for consistent display order
        marksData.sort((a, b) => {
            const aTime = configMap[a.subjectcode]?.createdAt ? new Date(configMap[a.subjectcode].createdAt).getTime() : 0;
            const bTime = configMap[b.subjectcode]?.createdAt ? new Date(configMap[b.subjectcode].createdAt).getTime() : 0;
            return aTime - bTime;
        });

        if (!marksData || marksData.length === 0) {
            return res.status(404).json({ success: false, message: 'Marks data not found for this student' });
        }

        // ── 3. Format Subjects Data ──────────────────────────────
        const subjects = marksData.map(mark => {
            const config = configMap[mark.subjectcode] || {};

            // FIX: Subject only included if student has at least one non-zero obtained mark
            // OR is legitimately marked absent — skips subjects with no data entered at all
            const hasActualMarks = [
                mark.term1periodictestobtained, mark.term1notebookobtained,
                mark.term1enrichmentobtained, mark.term1midexamobtained,
                mark.term2periodictestobtained, mark.term2notebookobtained,
                mark.term2enrichmentobtained, mark.term2annualexamobtained
            ].some(val => val !== null && val !== undefined && val !== '' && Number(val) > 0);

            const isAbsent = [
                mark.term1periodictestabsent, mark.term1midexamabsent,
                mark.term2periodictestabsent, mark.term2annualexamabsent
            ].some(abs => abs === true || abs === 'true');

            const hasMarks = hasActualMarks || isAbsent;

            // ── Term 1 ────────────────────────────────────────────
            const t1PTMax = config.term1periodictestmax || 40;
            const t1PTScaled = t1PTMax > 0 ? ((mark.term1periodictestobtained || 0) / t1PTMax) * 10 : 0;
            const t1NBMax = config.term1notebookmax || 5;
            const t1ENMax = config.term1enrichmentmax || 5;
            const t1MEMax = config.term1midexammax || 80;
            const term1Max = 10 + t1NBMax + t1ENMax + t1MEMax;
            const term1Total = parseFloat((
                t1PTScaled +
                (mark.term1notebookobtained || 0) +
                (mark.term1enrichmentobtained || 0) +
                (mark.term1midexamobtained || 0)
            ).toFixed(2));

            // ── Term 2 ────────────────────────────────────────────
            const t2PTMax = config.term2periodictestmax || 40;
            const t2PTScaled = t2PTMax > 0 ? ((mark.term2periodictestobtained || 0) / t2PTMax) * 10 : 0;
            const t2NBMax = config.term2notebookmax || 5;
            const t2ENMax = config.term2enrichmentmax || 5;
            const t2MEMax = config.term2annualexammax || 80;
            const term2Max = 10 + t2NBMax + t2ENMax + t2MEMax;
            const term2Total = parseFloat((
                t2PTScaled +
                (mark.term2notebookobtained || 0) +
                (mark.term2enrichmentobtained || 0) +
                (mark.term2annualexamobtained || 0)
            ).toFixed(2));

            return {
                subjectname: mark.subjectname,
                subjectcode: mark.subjectcode,
                isAdditional: config.isadditional || false, // overridden by top-5 logic below
                isCompulsory: config.iscompulsory || false,
                term1PeriodicTest: parseFloat(t1PTScaled.toFixed(1)),
                term1Notebook: mark.term1notebookobtained || 0,
                term1Enrichment: mark.term1enrichmentobtained || 0,
                term1MidExam: mark.term1midexamobtained || 0,
                term1Total,
                term1Max,
                term1Grade: calculateGrade(term1Total, term1Max),
                term2PeriodicTest: parseFloat(t2PTScaled.toFixed(1)),
                term2Notebook: mark.term2notebookobtained || 0,
                term2Enrichment: mark.term2enrichmentobtained || 0,
                term2AnnualExam: mark.term2annualexamobtained || 0,
                term2Total,
                term2Max,
                term2Grade: calculateGrade(term2Total, term2Max),
                isgrace: mark.isgrace || false,
                isabsent: mark.isabsent || false,
                term1periodictestabsent: mark.term1periodictestabsent || false,
                term1midexamabsent: mark.term1midexamabsent || false,
                term2periodictestabsent: mark.term2periodictestabsent || false,
                term2annualexamabsent: mark.term2annualexamabsent || false,
                compartmentobtained: (mark.compartmentobtained !== undefined && mark.compartmentobtained !== null)
                    ? mark.compartmentobtained : null,
                hasMarks
            };
        }).filter(s => s.hasMarks);

        // ── 4. Top-5 Selection & Totals ──────────────────────────
        const subjectScores = subjects.map(s => {
            const t1Norm = s.term1Max > 0 ? (s.term1Total / s.term1Max) * 100 : 0;
            const t2Norm = s.term2Max > 0 ? (s.term2Total / s.term2Max) * 100 : 0;
            const totalNormalized = parseFloat(((t1Norm * 0.5) + (t2Norm * 0.5)).toFixed(2));

            // FIX: Individual subject fail check on normalized term2
            const isFail = t2Norm < 33;

            return {
                total: totalNormalized,
                subjectcode: s.subjectcode,
                subjectname: s.subjectname,
                term1Total: s.term1Total,
                term2Total: s.term2Total,
                term1Max: s.term1Max,
                term2Max: s.term2Max,
                isCompulsory: s.isCompulsory || false,
                isFail
            };
        });

        const compulsorySubjects = subjectScores.filter(s => s.isCompulsory);
        const otherSubjects = subjectScores.filter(s => !s.isCompulsory);
        otherSubjects.sort((a, b) => b.total - a.total);

        const top5Set = new Set(compulsorySubjects.slice(0, 5));
        for (const s of otherSubjects) {
            if (top5Set.size >= 5) break;
            top5Set.add(s);
        }
        const top5 = Array.from(top5Set);

        // Mark subjects not in top-5 as additional
        subjects.forEach(s => {
            s.isAdditional = !top5.some(t => t.subjectcode === s.subjectcode);
        });

        // FIX: Normalize each top-5 subject to 100-scale before summing
        // so grandTotal and percentage are consistent with ranking logic
        const top5NormalizedTotal = top5.reduce((sum, s) => {
            const t1Norm = s.term1Max > 0 ? (s.term1Total / s.term1Max) * 100 : 0;
            const t2Norm = s.term2Max > 0 ? (s.term2Total / s.term2Max) * 100 : 0;
            return sum + (t1Norm * 0.5) + (t2Norm * 0.5);
        }, 0);

        // Raw totals (for display on marksheet)
        const term1TotalMarks = top5.reduce((sum, s) => sum + s.term1Total, 0);
        const term2TotalMarks = top5.reduce((sum, s) => sum + s.term2Total, 0);
        const term1TotalWeighted = parseFloat((term1TotalMarks * 0.5).toFixed(2));
        const term2TotalWeighted = parseFloat((term2TotalMarks * 0.5).toFixed(2));

        // Normalized grand total and percentage (consistent with rank calculation)
        const grandTotal = parseFloat(top5NormalizedTotal.toFixed(2));
        const maxMarks = top5.length * 100;
        const percentage = maxMarks > 0 ? parseFloat(((grandTotal / maxMarks) * 100).toFixed(2)) : 0;
        const overallGrade = calculateGrade(grandTotal, maxMarks);

        // Rank eligibility depends only on failures inside the selected top 5.
        const hasIndividualFail = top5.some(s => s.isFail);
        const studentHasFail = hasIndividualFail;

        // ── 5. Attendance ────────────────────────────────────────
        const fallbackRecord = marksData.length > 0 ? marksData[0] : {};
        const getVal = (rec, field) => (rec && rec[field]) ? rec[field] : 0;

        const attendanceData = {
            term1: {
                working: getVal(attendanceRecord, 'term1totalworkingdays') || getVal(fallbackRecord, 'term1totalworkingdays'),
                present: getVal(attendanceRecord, 'term1totalpresentdays') || getVal(fallbackRecord, 'term1totalpresentdays')
            },
            term2: {
                working: getVal(attendanceRecord, 'term2totalworkingdays') || getVal(fallbackRecord, 'term2totalworkingdays'),
                present: getVal(attendanceRecord, 'term2totalpresentdays') || getVal(fallbackRecord, 'term2totalpresentdays')
            }
        };

        // ── 5.5. Co-Scholastic Grades ────────────────────────────
        const coActivities = await CoScholasticActivity9ds.find({
            colid: Number(colid),
            semester: querySemester,
            academicyear,
            isactive: true
        }).sort({ createdat: 1 });

        const coGrades = await CoScholasticGrade9ds.find({
            colid: Number(colid),
            regno,
            semester: querySemester,
            academicyear
        });

        const coGradeMap = {};
        coGrades.forEach(g => { coGradeMap[g.activityid.toString()] = g; });

        // De-duplicate by activityname to prevent double display if multiple semesters are configured
        const coScholasticMap = {};
        coActivities.forEach(act => {
            const activityName = (act.activityname || '').trim().toUpperCase();
            const t1Grade = (coGradeMap[act._id.toString()] && coGradeMap[act._id.toString()].term1grade) || '';
            const t2Grade = (coGradeMap[act._id.toString()] && coGradeMap[act._id.toString()].term2grade) || '';

            const item = {
                code: act.code || '',
                area: act.activityname,
                term1Grade: t1Grade,
                term2Grade: t2Grade
            };

            // Prioritize entry that has at least one grade
            if (!coScholasticMap[activityName]) {
                coScholasticMap[activityName] = item;
            } else if (!coScholasticMap[activityName].term1Grade && !coScholasticMap[activityName].term2Grade) {
                if (t1Grade || t2Grade) {
                    coScholasticMap[activityName] = item;
                }
            }
        });

        const coScholasticData = Object.values(coScholasticMap);

        // ── 5.8. Dynamic Section-Wide Rank Calculation ───────────
        const sectionFilter = userData.section ? { section: userData.section } : {};
        const classStudents = await User.find({
            colid: Number(colid),
            semester: querySemester,
            role: 'Student',
            ...sectionFilter
        }).lean();

        const classRegNos = classStudents.map(s => s.regno);

        const allStudentMarks = await StudentMarks9ds.find({
            colid: Number(colid),
            semester: querySemester,
            academicyear,
            subjectcode: { $nin: ['ATTENDANCE', 'REMARKS'] },
            regno: { $in: classRegNos }
        }, {
            regno: 1, subjectcode: 1,
            term1periodictestobtained: 1, term1notebookobtained: 1,
            term1enrichmentobtained: 1, term1midexamobtained: 1,
            term2periodictestobtained: 1, term2notebookobtained: 1,
            term2enrichmentobtained: 1, term2annualexamobtained: 1,
            term1periodictestabsent: 1, term1midexamabsent: 1,
            term2periodictestabsent: 1, term2annualexamabsent: 1
        }).lean();

        const studentGroups = {};
        allStudentMarks.forEach(m => {
            if (!studentGroups[m.regno]) studentGroups[m.regno] = [];
            studentGroups[m.regno].push(m);
        });

        // Build rank data using shared computeTop5 helper
        let studentRankData = classStudents.map(student => {
            const result = computeTop5(studentGroups[student.regno] || [], configMap);
            if (!result) return null;
            return { regno: student.regno, percentage: result.pct, hasFail: result.hasFail };
        }).filter(Boolean).sort((a, b) => b.percentage - a.percentage);

        // FIX: Dense ranking — tied percentage = tied rank, no gaps
        studentRankData = assignDenseRanks(studentRankData);

        const myRankEntry = studentRankData.find(s => s.regno === regno);
        const rank = (myRankEntry && myRankEntry.rankValue) ? toRoman(myRankEntry.rankValue) : '-';

        // ── 6a. Compartment Subjects (top-5 only) ────────────────
        // FIX: Compare normalized term2 to 33, not raw marks
        const compartmentSubjects = subjects
            .filter(s => !s.isAdditional)
            .filter(s => {
                const t2Norm = s.term2Max > 0 ? (s.term2Total / s.term2Max) * 100 : 0;
                return t2Norm < 33;
            })
            .map(s => ({
                subjectname: s.subjectname,
                term1Total: s.term1Total,
                term2Total: s.term2Total,
                finalScore: parseFloat(s.term2Total.toFixed(1)),
                compartmentobtained: s.compartmentobtained
            }));

        // ── 6. Build & Return PDF Data ───────────────────────────
        const pdfData = {
            session: academicyear,
            classtype: '',
            profile: {
                name: userData.name || '',
                father: userData.fathername || '',
                mother: userData.mothername || '',
                address: userData.address || '',
                classSection: `Class ${semester} - ${userData.section || 'A'}`,
                rollNo: userData.rollno || '',
                dob: userData.dob || '',
                admissionNo: regno,
                contact: userData.phone || '',
                cbseRegNo: userData.cbseno || '',
                photo: userData.photo || '',
                section: userData.section || ''
            },
            attendance: attendanceData,
            subjects: subjects,
            coScholastic: coScholasticData,
            term1TotalMarks,
            term2TotalMarks,
            term1TotalWeighted,
            term2TotalWeighted,
            grandTotal,
            percentage,
            overallGrade,
            rank,
            studentHasFail,
            compartmentSubjects,
            remarks: remarksRecord.teacherremarks || attendanceRecord.teacherremarks || fallbackRecord.teacherremarks || '',
            promotedToClass: remarksRecord.promotedclass || attendanceRecord.promotedclass || fallbackRecord.promotedclass || '',
            newSessionDate: remarksRecord.newsessiondate || attendanceRecord.newsessiondate || fallbackRecord.newsessiondate || ''
        };

        res.json({ success: true, data: pdfData });

    } catch (error) {
        console.error('Error in getmarksheetpdfdata9top5ds:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate marksheet PDF data',
            error: error.message
        });
    }
};

// ============================================================
// Batch Calculate & Store Ranks for Class 9/10 Top-5
// ============================================================
exports.calculateAndStoreRank9top5ds = async (req, res) => {
    try {
        const { colid, academicyear, semester, section } = req.body;

        if (!colid || !academicyear || !semester) {
            return res.status(400).json({
                success: false,
                message: 'colid, academicyear, and semester are required'
            });
        }

        const querySemester = semester;

        // ── 1. Fetch Class Students ──────────────────────────────
        const studentQuery = {
            colid: Number(colid),
            semester: querySemester,
            role: 'Student'
        };
        if (section) studentQuery.section = section;

        const classStudents = await User.find(studentQuery).lean();

        if (!classStudents || classStudents.length === 0) {
            return res.status(404).json({ success: false, message: 'No students found for this class' });
        }

        const classRegNos = classStudents.map(s => s.regno);

        // ── 2. Fetch Subject Configs ─────────────────────────────
        const allConfigs = await SubjectComponentConfig9ds.find({
            colid: Number(colid),
            semester: querySemester,
            academicyear
        });
        const configMap = {};
        allConfigs.forEach(c => { configMap[c.subjectcode] = c; });

        // ── 3. Fetch All Student Marks ───────────────────────────
        const allStudentMarks = await StudentMarks9ds.find({
            colid: Number(colid),
            semester: querySemester,
            academicyear,
            subjectcode: { $nin: ['ATTENDANCE', 'REMARKS'] },
            regno: { $in: classRegNos }
        }).lean();

        const studentGroups = {};
        allStudentMarks.forEach(m => {
            if (!studentGroups[m.regno]) studentGroups[m.regno] = [];
            studentGroups[m.regno].push(m);
        });

        // ── 4. Compute Top-5 & Percentage per Student ────────────
        const studentsBySection = {};
        classStudents.forEach(student => {
            const sectionKey = student.section || '';
            if (!studentsBySection[sectionKey]) studentsBySection[sectionKey] = [];
            studentsBySection[sectionKey].push(student);
        });

        const studentRankData = [];
        Object.values(studentsBySection).forEach(sectionStudents => {
            let sectionRankData = sectionStudents.map(student => {
                const rNo = student.regno;
                const result = computeTop5(studentGroups[rNo] || [], configMap);
                if (!result) return null;
                return { regno: rNo, percentage: result.pct, hasFail: result.hasFail };
            }).filter(Boolean).sort((a, b) => b.percentage - a.percentage);

            sectionRankData = assignDenseRanks(sectionRankData);
            studentRankData.push(...sectionRankData);
        });

        // ── 6. Bulk Store Ranks ──────────────────────────────────
        const updateOps = studentRankData.map(sData => ({
            updateMany: {
                filter: { colid: Number(colid), regno: sData.regno, semester: querySemester, academicyear },
                update: {
                    $set: {
                        rank: sData.rankValue ? toRoman(sData.rankValue) : '-',
                        top5Percentage: sData.percentage
                    }
                }
            }
        }));

        if (updateOps.length > 0) {
            await StudentMarks9ds.bulkWrite(updateOps);
        }

        res.json({
            success: true,
            message: `Ranks updated for ${studentRankData.length} students.`,
            rankCounts: {
                total: studentRankData.length,
                ranked: studentRankData.filter(s => s.rankValue).length,
                skipped: studentRankData.filter(s => !s.rankValue).length
            }
        });

    } catch (error) {
        console.error('Error in calculateAndStoreRank9top5ds:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to calculate/store ranks',
            error: error.message
        });
    }
};
