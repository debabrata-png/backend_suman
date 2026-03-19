const User = require('../Models/user');
const Lead = require('../Models/crmh1');
const Ledgerstud = require('../Models/ledgerstud');
const Feesprovds = require('../Models/feesprovds');

exports.confirmadmissionds = async (req, res) => {
    try {
        const { lead_id, colid, concession, ...studentData } = req.body;

        // 1. Check if Lead exists
        const lead = await Lead.findById(lead_id);
        if (!lead) {
            return res.status(404).json({ success: false, message: "Lead not found" });
        }

        // 2. Check if User already exists (by email)
        const existingUser = await User.findOne({ email: studentData.email, colid });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "Student account already exists with this email" });
        }

        const hashedPassword = "Password@123";

        // 4. Create new User
        const newUser = new User({
            name: studentData.name,
            email: studentData.email,
            phone: studentData.phone,
            password: hashedPassword,
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

        await newUser.save();

        // 5. Fee Provisioning & Ledger Integration
        const provFees = await Feesprovds.find({
            colid: Number(colid),
            academicyear: studentData.admissionyear,
            programcode: studentData.programcode,
            semester: studentData.semester
        });

        if (provFees && provFees.length > 0) {
            let remainingConcession = Number(concession) || 0;

            for (const fee of provFees) {
                let itemConcession = 0;
                if (remainingConcession > 0) {
                    itemConcession = Math.min(remainingConcession, fee.amount);
                    remainingConcession -= itemConcession;
                }

                const newLedger = new Ledgerstud({
                    name: studentData.name,
                    user: studentData.email,
                    feegroup: fee.feegroup,
                    regno: studentData.regno,
                    student: studentData.name,
                    feeitem: fee.feeeitem,
                    amount: fee.amount,
                    paid: 0,
                    concession: itemConcession,
                    balance: fee.amount - itemConcession,
                    academicyear: studentData.admissionyear,
                    colid: Number(colid),
                    classdate: new Date(),
                    status: 'Active',
                    programcode: studentData.programcode,
                    admissionyear: studentData.admissionyear,
                    feecategory: fee.feecategory,
                    semester: fee.semester,
                    type: 'Regular' // Defaulting type
                });

                await newLedger.save();
            }
        }

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
