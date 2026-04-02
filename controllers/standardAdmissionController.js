const StandardAdmission = require('../Models/standardadmissionds');
const Fees = require('../Models/fees');
const User = require('../Models/user');
const Ledgerstud = require('../Models/ledgerstud');

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

        application = await StandardAdmission.create({
            fullName, mobileNo, email, academicYear,
            programLevel, school, program, password, colid, programId,
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
        const applications = await StandardAdmission.find(query).sort({ createdAt: -1 });

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
        const application = await StandardAdmission.findById(req.params.id);
        if (!application) return res.status(404).json({ status: 'fail', message: 'Application not found' });

        const { academicYear, program, category, colid, email, fullName, mobileNo, password } = application;

        // 1. Fetch Fees
        // Requirement: fetch using academic year and programcode and category
        // Assuming 'program' field in application maps to 'programcode' in Fees model OR we need to get programcode from application
        // Let's assume the 'program' name or code is stored correctly.
        const programFees = await Fees.find({
            academicyear: academicYear,
            programcode: program, // Assumes program name/code matches
            feecategory: category,
            colid
        });

        if (programFees.length === 0) {
            return res.status(400).json({ status: 'fail', message: 'No fee configuration found for this program and category' });
        }

        // 2. Create User
        // Check if user already exists in official Users table
        let officialUser = await User.findOne({ email });
        if (!officialUser) {
            officialUser = await User.create({
                name: fullName,
                email: email,
                phone: mobileNo,
                password: password,
                role: 'Student',
                regno: `TEMP_${Date.now()}`, // Placeholder for regno
                programcode: program,
                admissionyear: academicYear,
                semester: '1',
                section: 'NA',
                department: application.school,
                colid: colid,
                status: 1 // Active
            });
        }

        // 3. Add to Ledgerstud
        for (const fee of programFees) {
            await Ledgerstud.create({
                name: fullName,
                user: email,
                feegroup: fee.feegroup,
                regno: officialUser.regno,
                student: fullName,
                feeitem: fee.feeeitem,
                amount: fee.amount,
                paid: 0,
                concession: 0,
                balance: fee.amount,
                academicyear: academicYear,
                colid: colid,
                classdate: new Date(),
                status: 'Active',
                programcode: program,
                admissionyear: academicYear
            });
        }

        // 4. Update Application Status
        application.status = 'Approved';
        application.decisionDate = Date.now();
        await application.save();

        res.status(200).json({
            status: 'success',
            message: 'Application approved, user created, and fees allocated',
            data: application
        });

    } catch (err) {
        res.status(400).json({ status: 'fail', message: err.message });
    }
};
