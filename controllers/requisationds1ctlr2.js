const requisationds12 = require("../Models/requisationds12");
const requisationds2 = require("../Models/requisationds2");
const { purchaseRecordLog } = require('./purchaseauditutils');

// Add to Staging (Level 0)
exports.addrequisationds12 = async (req, res) => {
    let reqstatus = 'Pending Approval';
    try {
        if (req.body.approvalOption === 'Manual') {
            reqstatus = 'Approved';
        }

        const newReq = await requisationds12.create({ ...req.body, reqstatus });

        if (req.body.approvalOption === 'Manual') {
            // Directly create in Main Store Request table
            const mainReqPayload = newReq.toObject();
            delete mainReqPayload._id;
            delete mainReqPayload.__v;
            mainReqPayload.reqstatus = 'Pending'; // Pending for Store Manager now
            await requisationds2.create(mainReqPayload);
        }

        res.status(201).json({
            success: true,
            message: req.body.approvalOption === 'Manual' ? "Requisition approved and sent to store" : "Requisition sent for approval",
            data: newReq
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error adding requisition",
            error: error.message
        });
    } finally {
        if (req.body.colid) {
            purchaseRecordLog({
                username: req.body.username || req.body.faculty,
                useremail: req.body.useremail || req.body.facultyid,
                action: 'SUBMIT',
                module: 'REQUISITION',
                colid: req.body.colid,
                details: { item: req.body.itemname, quantity: req.body.quantity, status: reqstatus }
            });
        }
    }
};

// Get All Staging (For Approver)
exports.getallrequisationds12 = async (req, res) => {
    try {
        const { colid } = req.query;
        // Fetch only those pending approval? Or all? Let's fetch all for history, filtering in frontend usually.
        const requisitions = await requisationds12.find({ colid }).sort({ reqdate: -1 });
        res.status(200).json({
            success: true,
            count: requisitions.length,
            data: { requisitions }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching requisitions",
            error: error.message
        });
    }
};

// Approve: Move from ds1 to ds
exports.approverequisationds12 = async (req, res) => {
    const { id, approverRole, approverName } = req.body;
    let stagingReq;
    let shouldGoToStore = false;
    try {
        stagingReq = await requisationds12.findById(id);

        if (!stagingReq) {
            return res.status(404).json({ success: false, message: "Requisition not found" });
        }

        if (stagingReq.reqstatus === 'Approved') {
            return res.status(400).json({ success: false, message: "Already Approved" });
        }

        if (stagingReq.approvalOption === 'Manual') {
            if (approverRole === 'AHOI') {
                stagingReq.ahoiApproved = true;
                stagingReq.ahoiApproverName = approverName || 'AHOI';
            } else if (approverRole === 'HOI') {
                stagingReq.hoiApproved = true;
                stagingReq.hoiApproverName = approverName || 'HOI';
            }

            // Check if ANY have approved for Manual option
            if (stagingReq.hoiApproved || stagingReq.ahoiApproved) {
                shouldGoToStore = true;
            }
        } else {
            // Default HOI path (Direct to Store after HOI approval)
            stagingReq.hoiApproved = true;
            stagingReq.hoiApproverName = approverName || 'HOI';
            shouldGoToStore = true;
        }

        if (shouldGoToStore) {
            // Create in Main Store Request
            // We strip _id to let mongo generate new one, or mapped fields
            const mainReqPayload = stagingReq.toObject();
            delete mainReqPayload._id;
            delete mainReqPayload.__v;
            mainReqPayload.reqstatus = 'Pending'; // Pending for Store Manager now

            const newMainReq = await requisationds2.create(mainReqPayload);

            // Update Staging Status
            stagingReq.reqstatus = 'Approved';
            await stagingReq.save();

            return res.status(200).json({
                success: true,
                message: "Requisition Approved and Sent to Store",
                data: newMainReq
            });
        } else {
            await stagingReq.save();
            return res.status(200).json({
                success: true,
                message: "Requisition partially approved by HOI.",
                data: stagingReq
            });
        }

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error approving requisition",
            error: error.message
        });
    } finally {
        if (id) {
            purchaseRecordLog({
                username: req.body.username || approverName,
                useremail: req.body.useremail,
                action: 'APPROVE',
                module: 'REQUISITION',
                recordid: id,
                colid: stagingReq?.colid,
                details: { role: approverRole, name: approverName, fullyApproved: shouldGoToStore }
            });
        }
    }
};

// Reject in Staging
exports.rejectrequisationds12 = async (req, res) => {
    const { id } = req.body;
    try {
        await requisationds12.findByIdAndUpdate(id, { reqstatus: 'Rejected' });
        res.status(200).json({ success: true, message: "Requisition Rejected" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error rejecting requisition", error: error.message });
    } finally {
        if (id) {
            purchaseRecordLog({
                username: req.body.username,
                useremail: req.body.useremail,
                action: 'REJECT',
                module: 'REQUISITION',
                recordid: id,
                colid: req.body.colid, // This needs to be passed in req body for lookup if not available to stagingReq
                details: { id }
            });
        }
    }
};

exports.deleterequisationds12 = async (req, res) => {
    const { id } = req.query;
    try {
        await requisationds12.findByIdAndDelete(id);
        res.status(200).json({ success: true, message: "Requisition deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error deleting requisition", error: error.message });
    } finally {
        if (id) {
            purchaseRecordLog({
                username: req.query.username,
                useremail: req.query.useremail,
                action: 'DELETE',
                module: 'REQUISITION',
                recordid: id,
                colid: req.query.colid,
                details: { id }
            });
        }
    }
};
