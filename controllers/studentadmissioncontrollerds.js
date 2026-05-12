const User = require('../Models/user');
const Lead = require('../Models/crmh1');
const admissionService = require('./admissionSharedService');

exports.confirmadmissionds = async (req, res) => {
    try {
        const { lead_id, colid, concession, feeType = 'provisional', documents = [], ...studentData } = req.body;

        // 1. Check if Lead exists
        const lead = await Lead.findById(lead_id);
        if (!lead) {
            return res.status(404).json({ success: false, message: "Lead not found" });
        }

        const existingUser = await User.findOne({ email: studentData.email, colid: Number(colid) });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "Student account already exists with this email" });
        }

        const { user: newUser } = await admissionService.createOrGetStudent({
            colid,
            data: {
                ...lead.toObject(),
                ...studentData,
                name: studentData.name || lead.name,
                email: studentData.email || lead.email,
                phone: studentData.phone || lead.phone,
                password: studentData.password || 'Password@123',
                department: studentData.department || lead.course_interested,
                program: studentData.course_interested || lead.course_interested
            }
        });

        const fees = await admissionService.fetchAdmissionFees({
            colid,
            academicyear: studentData.admissionyear,
            programcode: studentData.programcode,
            semester: studentData.semester,
            feecategory: studentData.feecategory,
            feeType
        });

        if (fees && fees.length > 0) {
            await admissionService.createLedgerEntries({
                fees,
                colid,
                concession,
                feeType,
                student: {
                    name: newUser.name,
                    email: newUser.email,
                    regno: newUser.regno,
                    programcode: newUser.programcode,
                    admissionyear: newUser.admissionyear,
                    semester: newUser.semester
                }
            });
        }

        await admissionService.saveStudentDocuments({
            colid,
            student: newUser,
            documents
        });

        /* Legacy shape kept here as a reference for field mapping:
        new User({
            name: studentData.name,
            email: studentData.email,
            phone: studentData.phone,
            password: "Password@123",
            role: 'Student',
            colid: Number(colid),
            status: 1,
            regno: studentData.regno,
            programcode: studentData.programcode,
            department: studentData.department,
            admissionyear: studentData.admissionyear,
            semester: studentData.semester,
            section: studentData.section,
            address: studentData.address || lead.address || "",
            city: studentData.city || lead.city || "",
            state: studentData.state || lead.state || "",
            designation: "Student"
        });
        */

        // 6. Update Lead Status
        lead.leadstatus = "Converted";
        lead.provissionalfeepaid = "Yes"; // Assuming confirmation implies provisional fee handling
        await lead.save();

        res.status(201).json({
            success: true,
            message: "Student admission confirmed, account created, and ledger updated.",
            data: newUser
        });

    } catch (error) {
        console.error("Error confirming admission:", error);
        res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
};
