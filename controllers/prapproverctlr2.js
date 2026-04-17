const prapproverds = require("../Models/prapproverds");
const storerequisationds2 = require("../Models/storerequisationds2");
const { purchaseRecordLog } = require("./purchaseauditutils");

exports.addPRApprover2 = async (req, res) => {
    try {
        const { colid, level } = req.body;
        // Check if level already exists for this colid
        const existing = await prapproverds.findOne({ colid, level });
        if (existing) {
            return res.status(400).json({ success: false, message: `Level ${level} already configured for this institution.` });
        }

        const newApprover = await prapproverds.create(req.body);
        res.status(201).json({
            success: true,
            message: "PR Approver added successfully",
            data: newApprover
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error adding PR Approver",
            error: error.message
        });
    }
};

exports.getPRApprovers2 = async (req, res) => {
    try {
        const { colid } = req.query;
        const approvers = await prapproverds.find({ colid }).sort({ level: 1 });
        res.status(200).json({
            success: true,
            count: approvers.length,
            data: approvers
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching PR Approvers",
            error: error.message
        });
    }
};

exports.deletePRApprover2 = async (req, res) => {
    try {
        const { id } = req.query;
        await prapproverds.findByIdAndDelete(id);
        res.status(200).json({ success: true, message: "PR Approver deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error deleting PR Approver", error: error.message });
    }
};

exports.verifyPRStep2 = async (req, res) => {
    try {
        const { id, user_email, user_name } = req.body;

        const pr = await storerequisationds2.findById(id);
        if (!pr) return res.status(404).json({ success: false, message: "PR not found" });

        if (pr.reqstatus !== 'Pending Approval') {
            return res.status(400).json({ success: false, message: `PR is currently in '${pr.reqstatus}' status.` });
        }

        // Fetch Config Steps for PR Approvers
        const steps = await prapproverds.find({ colid: pr.colid, status: 1 }).sort({ level: 1 });

        if (steps.length === 0) {
            // This shouldn't happen if it's in 'Pending Approval', but handle it
            pr.reqstatus = 'Pending';
            await pr.save();
            return res.status(200).json({ success: true, message: "No approvers found. PR moved to store.", data: pr });
        }

        const currentStepIndex = pr.currentStep - 1; 
        if (currentStepIndex >= steps.length) {
            return res.status(400).json({ success: false, message: "Already fully approved." });
        }

        const stepConfig = steps[currentStepIndex];

        // Authorization Check
        if (stepConfig.approveruserid !== user_email) {
            return res.status(403).json({ success: false, message: `Unauthorized. Waiting for Level ${pr.currentStep} approval by ${stepConfig.approveruserid}` });
        }

        // Proceed with Approval
        const nextStep = pr.currentStep + 1;
        const isFullyApproved = nextStep > steps.length;

        if (isFullyApproved) {
            pr.reqstatus = 'Pending'; // Ready for Purchase Cell
            pr.approvalStatus = 'Completed';
        } else {
            pr.currentStep = nextStep;
            pr.reqstatus = 'Pending Approval';
            pr.approvalStatus = `Pending Level ${nextStep}`;
        }

        await pr.save();

        // Audit Log
        await purchaseRecordLog({
            username: user_name || user_email,
            useremail: user_email,
            action: 'APPROVE',
            module: 'STORE_REQUISITION',
            recordid: id,
            colid: pr.colid,
            details: { 
                level: pr.currentStep - (isFullyApproved ? 0 : 1), 
                nextStep: isFullyApproved ? 'Store' : nextStep,
                fullyApproved: isFullyApproved 
            }
        });

        res.status(200).json({ 
            success: true, 
            message: isFullyApproved ? "PR Fully Approved and sent to Purchase Cell" : `Level ${pr.currentStep - 1} Approved`, 
            data: pr 
        });

    } catch (error) {
        res.status(500).json({ success: false, message: "Error verifying PR step", error: error.message });
    }
};

exports.rejectPR2 = async (req, res) => {
    try {
        const { id, user_email, user_name, remarks } = req.body;
        const pr = await storerequisationds2.findById(pr).id || await storerequisationds2.findById(id); 
        // Note: id check above is safer
        
        const updatedPR = await storerequisationds2.findByIdAndUpdate(id, { 
            reqstatus: 'Rejected',
            approvalStatus: 'Rejected',
            remarks: remarks || pr.remarks
        }, { new: true });

        if (!updatedPR) return res.status(404).json({ success: false, message: "PR not found" });

        // Audit Log
        await purchaseRecordLog({
            username: user_name || user_email,
            useremail: user_email,
            action: 'REJECT',
            module: 'STORE_REQUISITION',
            recordid: id,
            colid: updatedPR.colid,
            details: { remarks }
        });

        res.status(200).json({ success: true, message: "PR Rejected", data: updatedPR });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error rejecting PR", error: error.message });
    }
};

exports.getPRsForApproval2 = async (req, res) => {
    try {
        const { colid, user_email } = req.query;
        if (!user_email) return res.status(400).json({ success: false, message: 'user_email is required' });

        const cid = Number(colid);
        
        // 1. Get user's approval configuration
        const myConfigs = await prapproverds.find({ colid: cid, approveruserid: user_email, status: 1 });
        if (myConfigs.length === 0) {
            return res.status(200).json({ success: true, data: [] });
        }

        // 2. Find PRs that match the user's configured level
        const levels = myConfigs.map(c => c.level);
        const prs = await storerequisationds2.find({
            colid: cid,
            reqstatus: 'Pending Approval',
            currentStep: { $in: levels }
        }).sort({ reqdate: -1 });

        res.status(200).json({ success: true, data: prs });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching PRs for approval", error: error.message });
    }
};
