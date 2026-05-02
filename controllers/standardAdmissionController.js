const StandardAdmission = require('../Models/standardadmissionds');
const admissionService = require('./admissionSharedService');
const User = require('../Models/user');
const Ledgerstud = require('../Models/ledgerstud');
const StudentDocument = require('../Models/studentdocumentds');

// Step 0: Registration
exports.registerStep0 = async (req, res) => {
    try {
        const {
            fullName, mobileNo, email, academicYear,
            programLevel, school, program, password, colid, programId
        } = req.body;

        // Check if already exists
        let application = await StandardAdmission.findOne({ email });
        if (application) {
            return res.status(400).json({ status: 'fail', message: 'Email already registered' });
        }

        // Generate Admission Number: JGU2627/0001
        // academicYear format: 2026-27
        const yearPart = academicYear.replace(/-/g, '').slice(2); // 2026-27 -> 2627
        const prefix = `JGU${yearPart}/`;
        
        const lastApp = await StandardAdmission.findOne({ 
            admissionNo: new RegExp(`^${prefix}`) 
        }).sort({ admissionNo: -1 });

        let nextNumber = 1;
        if (lastApp && lastApp.admissionNo) {
            const lastNum = parseInt(lastApp.admissionNo.split('/')[1]);
            if (!isNaN(lastNum)) nextNumber = lastNum + 1;
        }
        const admissionNo = `${prefix}${nextNumber.toString().padStart(4, '0')}`;

        application = await StandardAdmission.create({
            fullName, mobileNo, email, academicYear,
            programLevel, school, program, password, colid, programId,
            admissionNo,
            currentStep: 0,
            status: 'Draft'
        });

        res.status(201).json({
            status: 'success',
            data: application
        });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

// Login to resume mapping (simple email/password check)
exports.loginToResume = async (req, res) => {
    try {
        const { email, password } = req.body;
        const application = await StandardAdmission.findOne({ email, password });

        if (!application) {
            return res.status(401).json({ status: 'fail', message: 'Invalid credentials' });
        }

        res.status(200).json({
            status: 'success',
            data: application
        });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

// Update Step Data (Steps 1, 2, 5)
exports.updateStepData = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Ensure currentStep is updated appropriately
        if (updateData.currentStep) {
            // logic to prevent going backwards if needed
        }

        const application = await StandardAdmission.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true
        });

        if (!application) {
            return res.status(404).json({ status: 'fail', message: 'Application not found' });
        }

        res.status(200).json({
            status: 'success',
            data: application
        });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

// Admin: Get all applications
exports.getAllApplications = async (req, res) => {
    try {
        const { colid, programLevel, status } = req.query;
        let query = { colid };

        if (programLevel) query.programLevel = programLevel;
        if (status) query.status = status;

        console.log("Fetching Applications with query:", query);
        const applications = await StandardAdmission.find(query).populate('programId').sort({ createdAt: -1 });

        res.status(200).json({
            status: 'success',
            results: applications.length,
            data: applications
        });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

// Admin: Get Single Application
exports.getApplicationDetails = async (req, res) => {
    try {
        const application = await StandardAdmission.findById(req.params.id);
        if (!application) {
            return res.status(404).json({ status: 'fail', message: 'Application not found' });
        }
        res.status(200).json({ status: 'success', data: application });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

// Admin: Update Status (Reject/Hold)
exports.updateApplicationStatus = async (req, res) => {
    try {
        const { status, adminComments } = req.body;
        const application = await StandardAdmission.findByIdAndUpdate(req.params.id, {
            status,
            adminComments,
            decisionDate: Date.now()
        }, { new: true });

        res.status(200).json({ status: 'success', data: application });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

// Admin: Approve Application (The Heavy Lifting)
exports.approveApplication = async (req, res) => {
    try {
        const application = await StandardAdmission.findById(req.params.id).populate('programId');
        if (!application) return res.status(404).json({ status: 'fail', message: 'Application not found' });

        const {
            feeType = 'fees',
            programcode,
            academicyear,
            semester = '1',
            feecategory,
            concession = 0,
            regno,
            fullName,
            email,
            mobileNo,
            phone,
            dob,
            gender,
            category,
            fatherName,
            fatherMobile,
            fatherEmail,
            motherName,
            motherMobile,
            motherEmail,
            guardianName,
            guardianMobile,
            guardianEmail,
            aadharNumber,
            whatsAppNumber,
            address,
            city,
            district,
            state,
            pincode
        } = req.body || {};

        const programCodeValue = programcode || (Array.isArray(application.program) ? application.program[0] : application.program);
        const academicYearValue = academicyear || application.academicYear;

        const fees = await admissionService.fetchAdmissionFees({
            colid: application.colid,
            academicyear: academicYearValue,
            programcode: programCodeValue,
            semester,
            feecategory: feecategory || application.category,
            feeType
        });

        if (fees.length === 0) {
            return res.status(400).json({ status: 'fail', message: 'No fee configuration found for the selected fee type and criteria' });
        }

        const { user: officialUser } = await admissionService.createOrGetStudent({
            colid: application.colid,
            data: {
                ...application.toObject(),
                name: fullName || application.fullName,
                fullName: fullName || application.fullName,
                email: email || application.email,
                phone: phone || mobileNo || application.mobileNo,
                mobileNo: mobileNo || phone || application.mobileNo,
                dob: dob || application.dob,
                gender: gender || application.gender,
                category: category || application.category,
                fatherName: fatherName || application.fatherName,
                fatherMobile: fatherMobile || application.fatherMobile,
                fatherEmail: fatherEmail || application.fatherEmail,
                motherName: motherName || application.motherName,
                motherMobile: motherMobile || application.motherMobile,
                motherEmail: motherEmail || application.motherEmail,
                guardianName: guardianName || application.guardianName,
                guardianMobile: guardianMobile || application.guardianMobile,
                guardianEmail: guardianEmail || application.guardianEmail,
                aadharNumber: aadharNumber || application.aadharNumber,
                whatsAppNumber: whatsAppNumber || application.whatsAppNumber,
                address: address || application.permanentAddress?.addressLine1 || application.correspondenceAddress?.addressLine1,
                city: city || application.permanentAddress?.city || application.correspondenceAddress?.city,
                state: state || application.permanentAddress?.state || application.correspondenceAddress?.state,
                district: district || application.permanentAddress?.district || application.correspondenceAddress?.district,
                pincode: pincode || application.permanentAddress?.pincode || application.correspondenceAddress?.pincode,
                regno: regno || application.regno,
                programcode: programCodeValue,
                admissionyear: academicYearValue,
                semester,
                department: Array.isArray(application.school) ? [...new Set(application.school)].join(', ') : application.school
            }
        });

        await admissionService.createLedgerEntries({
            fees,
            colid: application.colid,
            concession,
            feeType,
            student: {
                name: officialUser.name,
                email: officialUser.email,
                regno: officialUser.regno,
                programcode: officialUser.programcode,
                admissionyear: officialUser.admissionyear,
                semester: officialUser.semester
            }
        });

        await admissionService.saveStudentDocuments({
            colid: application.colid,
            student: officialUser,
            documents: application.documents
        });

        application.status = 'Approved';
        application.fullName = fullName || application.fullName;
        application.email = email || application.email;
        application.mobileNo = mobileNo || phone || application.mobileNo;
        application.dob = dob || application.dob;
        application.gender = gender || application.gender;
        application.category = category || application.category;
        application.fatherName = fatherName || application.fatherName;
        application.fatherMobile = fatherMobile || application.fatherMobile;
        application.fatherEmail = fatherEmail || application.fatherEmail;
        application.motherName = motherName || application.motherName;
        application.motherMobile = motherMobile || application.motherMobile;
        application.motherEmail = motherEmail || application.motherEmail;
        application.guardianName = guardianName || application.guardianName;
        application.guardianMobile = guardianMobile || application.guardianMobile;
        application.guardianEmail = guardianEmail || application.guardianEmail;
        application.aadharNumber = aadharNumber || application.aadharNumber;
        application.whatsAppNumber = whatsAppNumber || application.whatsAppNumber;
        application.permanentAddress = {
            ...(application.permanentAddress?.toObject ? application.permanentAddress.toObject() : application.permanentAddress || {}),
            addressLine1: address || application.permanentAddress?.addressLine1,
            city: city || application.permanentAddress?.city,
            district: district || application.permanentAddress?.district,
            state: state || application.permanentAddress?.state,
            pincode: pincode || application.permanentAddress?.pincode
        };
        application.regno = officialUser.regno;
        application.decisionDate = Date.now();
        await application.save();

        res.status(200).json({
            status: 'success',
            message: 'Application approved, user created, and fees allocated',
            data: { application, user: officialUser, fees }
        });

    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};

exports.getAdmissionFees = async (req, res) => {
    try {
        const { colid, academicyear, programcode, semester, feecategory, feeType = 'fees' } = req.body;
        const data = await admissionService.fetchAdmissionFees({
            colid,
            academicyear,
            programcode,
            semester,
            feecategory,
            feeType
        });
        res.status(200).json({ success: true, data });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

exports.getStudentAdmissionProfile = async (req, res) => {
    try {
        const { colid, regno, userId, email } = req.query;
        const userQuery = { colid: Number(colid), role: 'Student' };
        if (userId) userQuery._id = userId;
        if (regno) userQuery.regno = regno;
        if (email) userQuery.email = email;

        const user = await User.findOne(userQuery).lean();
        if (!user) return res.status(404).json({ success: false, message: 'Student not found' });

        const [documents, ledger, application] = await Promise.all([
            StudentDocument.find({ colid: Number(colid), regno: user.regno }).sort({ documentname: 1 }).lean(),
            Ledgerstud.find({ colid: Number(colid), regno: user.regno }).sort({ classdate: -1 }).lean(),
            StandardAdmission.findOne({ colid: Number(colid), $or: [{ regno: user.regno }, { email: user.email }] }).lean()
        ]);

        res.status(200).json({
            success: true,
            data: { user, documents, ledger, application }
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};
