const User = require('../Models/user');
const excel = require('exceljs');
const tempfile = require('tempfile');

// Unified Role Regex (Relaxed match for robustness)
const STUDENT_ROLE = /Student/i;

// Utility to build the match query from filters
const buildMatchQuery = (params) => {
    const { colid1, programcode, admissionyear, semester, department, gender, category } = params;

    if (!colid1) return null;

    const colidNum = parseInt(colid1);
    const colidStr = String(colid1);

    const matchQuery = {
        $and: [
            { $or: [{ colid: colidNum }, { colid: colidStr }] },
            { role: { $regex: STUDENT_ROLE } }
        ]
    };

    // Using loose matching for strings to handle potential whitespace (trimmed in regex)
    if (programcode && programcode.trim()) matchQuery.$and.push({ programcode: { $regex: new RegExp(`^${programcode.trim()}$`, 'i') } });
    if (admissionyear && admissionyear.trim()) matchQuery.$and.push({ admissionyear: { $regex: new RegExp(`^${admissionyear.trim()}$`, 'i') } });
    if (semester && semester.trim()) matchQuery.$and.push({ semester: { $regex: new RegExp(`^${semester.trim()}$`, 'i') } });
    if (department && department.trim()) matchQuery.$and.push({ department: { $regex: new RegExp(`^${department.trim()}$`, 'i') } });
    if (gender && gender.trim()) matchQuery.$and.push({ gender: { $regex: new RegExp(`^${gender.trim()}$`, 'i') } });
    if (category && category.trim()) matchQuery.$and.push({ category: { $regex: new RegExp(`^${category.trim()}$`, 'i') } });

    return matchQuery;
};

// 1. Get Distinct Filter Values for Students
exports.getstudentfiltersds = async (req, res) => {
    try {
        const { colid1, admissionyear, department, programcode } = req.query;
        if (!colid1) return res.status(400).json({ status: 'error', message: 'colid1 is required' });

        const baseMatch = buildMatchQuery({ colid1 }); // Only institution + role filter

        const result = await User.aggregate([
            { $match: baseMatch }, // Apply base filter to all facets for performance and consistency
            {
                $facet: {
                    admissionyears: [
                        { $group: { _id: "$admissionyear" } },
                        { $match: { _id: { $ne: null } } }
                    ],
                    departments: [
                        // For cascading options, we filter by the selected parents
                        { $match: buildMatchQuery({ colid1, admissionyear }) }, 
                        { $group: { _id: "$department" } },
                        { $match: { _id: { $ne: null } } }
                    ],
                    programcodes: [
                        { $match: buildMatchQuery({ colid1, admissionyear, department }) },
                        { $group: { _id: "$programcode" } },
                        { $match: { _id: { $ne: null } } }
                    ],
                    semesters: [
                        { $match: buildMatchQuery({ colid1, admissionyear, department, programcode }) },
                        { $group: { _id: "$semester" } },
                        { $match: { _id: { $ne: null } } }
                    ],
                    genders: [
                        { $match: buildMatchQuery({ colid1, admissionyear, department, programcode }) },
                        { $group: { _id: "$gender" } },
                        { $match: { _id: { $ne: null } } }
                    ],
                    categories: [
                        { $match: buildMatchQuery({ colid1, admissionyear, department, programcode }) },
                        { $group: { _id: "$category" } },
                        { $match: { _id: { $ne: null } } }
                    ]
                }
            }
        ]);

        const data = result[0] || {};
        const formatted = {};
        Object.keys(data).forEach(key => {
            if (Array.isArray(data[key])) {
                formatted[key] = data[key].map(item => item._id).filter(id => id !== null).sort();
            } else {
                formatted[key] = [];
            }
        });

        res.status(200).json({
            status: 'success',
            data: formatted
        });
    } catch (error) {
        console.error("Error in getstudentfiltersds:", error);
        res.status(500).json({ status: 'error', message: error.message });
    }
};

// 2. Get Student Report Data with Filters
exports.getstudentreportds = async (req, res) => {
    try {
        const matchQuery = buildMatchQuery(req.body);
        if (!matchQuery) return res.status(400).json({ status: 'error', message: 'colid1 is required' });

        const stats = await User.aggregate([
            { $match: matchQuery },
            {
                $facet: {
                    programStats: [
                        { $group: { _id: "$programcode", count: { $sum: 1 } } },
                        { $project: { name: { $ifNull: ["$_id", "Unknown"] }, value: "$count", _id: 0 } },
                        { $sort: { value: -1 } }
                    ],
                    yearStats: [
                        { $group: { _id: "$admissionyear", count: { $sum: 1 } } },
                        { $project: { name: { $ifNull: ["$_id", "Unknown"] }, value: "$count", _id: 0 } },
                        { $sort: { name: 1 } }
                    ],
                    semesterStats: [
                        { $group: { _id: "$semester", count: { $sum: 1 } } },
                        { $project: { name: { $ifNull: ["$_id", "Unknown"] }, value: "$count", _id: 0 } },
                        { $sort: { name: 1 } }
                    ],
                    departmentStats: [
                        { $group: { _id: "$department", count: { $sum: 1 } } },
                        { $project: { name: { $ifNull: ["$_id", "Unknown"] }, value: "$count", _id: 0 } },
                        { $sort: { value: -1 } }
                    ],
                    genderStats: [
                        { $group: { _id: "$gender", count: { $sum: 1 } } },
                        { $project: { name: { $ifNull: ["$_id", "Unknown"] }, value: "$count", _id: 0 } }
                    ],
                    categoryStats: [
                        { $group: { _id: "$category", count: { $sum: 1 } } },
                        { $project: { name: { $ifNull: ["$_id", "Unknown"] }, value: "$count", _id: 0 } }
                    ],
                    totalStudents: [
                        { $count: "count" }
                    ]
                }
            }
        ]);

        const data = stats[0];
        data.totalStudents = data.totalStudents[0] ? data.totalStudents[0].count : 0;

        res.status(200).json({
            status: 'success',
            data: data,
            debug: { query: matchQuery }
        });

    } catch (error) {
        console.error("Error in getstudentreportds:", error);
        res.status(500).json({ status: 'error', message: error.message });
    }
};

// 3. Get Student List with Filters
exports.getstudentlistds = async (req, res) => {
    try {
        const matchQuery = buildMatchQuery(req.body);
        if (!matchQuery) return res.status(400).json({ status: 'error', message: 'colid1 is required' });

        const students = await User.find(matchQuery)
            .select('-password -colid -lastlogin -status -status1')
            .sort({ name: 1 })
            .limit(1000);

        res.status(200).json({
            status: 'success',
            data: students
        });
    } catch (error) {
        console.error("Error in getstudentlistds:", error);
        res.status(500).json({ status: 'error', message: error.message });
    }
};

// 4. Export Student Data to Excel
exports.exportstudentexcelds = async (req, res) => {
    try {
        const matchQuery = buildMatchQuery(req.body);
        if (!matchQuery) return res.status(400).json({ status: 'error', message: 'colid1 is required' });

        const students = await User.find(matchQuery).sort({ name: 1 });

        let workbook = new excel.Workbook();
        let worksheet = workbook.addWorksheet('Students');

        // Define columns based on User schema, excluding colid, lastlogin, status, status1
        worksheet.columns = [
            { header: 'Name', key: 'name', width: 25 },
            { header: 'Email', key: 'email', width: 25 },
            { header: 'Phone', key: 'phone', width: 15 },
            { header: 'Role', key: 'role', width: 15 },
            { header: 'Reg No', key: 'regno', width: 20 },
            { header: 'Program Code', key: 'programcode', width: 20 },
            { header: 'Admission Year', key: 'admissionyear', width: 15 },
            { header: 'Semester', key: 'semester', width: 12 },
            { header: 'Section', key: 'section', width: 10 },
            { header: 'Gender', key: 'gender', width: 10 },
            { header: 'Department', key: 'department', width: 20 },
            { header: 'Category', key: 'category', width: 15 },
            { header: 'Address', key: 'address', width: 30 },
            { header: 'Quota', key: 'quota', width: 15 },
            { header: 'Father Name', key: 'fathername', width: 25 },
            { header: 'Mother Name', key: 'mothername', width: 25 },
            { header: 'DOB', key: 'dob', width: 15 },
            { header: 'Eligibility', key: 'eligibilityname', width: 20 },
            { header: 'Roll No', key: 'rollno', width: 20 },
            { header: 'Adhaar No', key: 'adhaarno', width: 20 },
            { header: 'WP No', key: 'wpno', width: 20 },
            { header: 'Blood Group', key: 'bloodgroup', width: 10 },
            { header: 'Joining Date', key: 'joiningdate', width: 15, outlineLevel: 1 },
            { header: 'Designation', key: 'designation', width: 20 },
            { header: 'ABC ID', key: 'abcid', width: 20 },
            { header: 'Income', key: 'income', width: 15 },
            { header: 'EWS', key: 'ews', width: 10 },
            { header: 'Institution', key: 'institution', width: 25 },
            { header: 'Degree', key: 'degree', width: 20 },
            { header: 'Scholarship', key: 'scholarship', width: 15 },
            { header: 'Minor Sub', key: 'minorsub', width: 20 },
            { header: 'Vocational Sub', key: 'vocationalsub', width: 20 },
            { header: 'MDC Sub', key: 'mdcsub', width: 20 },
            { header: 'Other Sub', key: 'othersub', width: 20 },
            { header: 'Merit', key: 'merit', width: 15 },
            { header: 'Obtain', key: 'obtain', width: 15 },
            { header: 'Bonus', key: 'bonus', width: 15 },
            { header: 'Weightage', key: 'weightage', width: 15 },
            { header: 'NCC Type', key: 'ncctype', width: 15 },
            { header: 'Is Disabled', key: 'isdisabled', width: 15 }
        ];

        worksheet.addRows(students);

        // Styling the header
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFECECEC' }
        };

        const tempFilePath = tempfile('.xlsx');
        await workbook.xlsx.writeFile(tempFilePath);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader("Content-Disposition", `attachment; filename=Student_Report_${new Date().getTime()}.xlsx`);
        res.sendFile(tempFilePath);

    } catch (error) {
        console.error("Error in exportstudentexcelds:", error);
        res.status(500).json({ status: 'error', message: error.message });
    }
};
