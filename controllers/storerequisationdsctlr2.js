const storerequisationds2 = require("../Models/storerequisationds2");
const prapproverds = require("../Models/prapproverds");
const { purchaseRecordLog } = require('./purchaseauditutils');

exports.addstorerequisationds2 = async (req, res) => {
    try {
        const { colid } = req.body;
        
        // Default initial status
        let reqstatus = 'Pending';
        let currentStep = 1;
        let approvalStatus = 'Direct to Store';

        // Check if any PR approvers are configured for this colid
        const approvers = await prapproverds.find({ colid, status: 1 }).sort({ level: 1 });

        if (approvers.length > 0) {
            reqstatus = 'Pending Approval';
            approvalStatus = 'Pending Level 1';
            currentStep = 1;
        }

        const newReq = await storerequisationds2.create({ 
            ...req.body, 
            reqstatus, 
            currentStep, 
            approvalStatus 
        });

        // Audit Log
        if (colid) {
            await purchaseRecordLog({
                username: req.body.username || req.body.name || req.body.user,
                useremail: req.body.useremail || req.body.user,
                action: 'SUBMIT',
                module: 'STORE_REQUISITION',
                recordid: newReq._id,
                colid: colid,
                details: { 
                    item: req.body.itemname, 
                    quantity: req.body.quantity, 
                    status: reqstatus,
                    approvalRequired: approvers.length > 0
                }
            });
        }

        res.status(201).json({
            success: true,
            message: approvers.length > 0 ? "Store Requisition sent for approval" : "Store Requisition added successfully",
            data: newReq
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error adding store requisition",
            error: error.message
        });
    }
};

exports.getallstorerequisationds2 = async (req, res) => {
    try {
        const { colid, page, limit, reqstatus, storeid } = req.query;
        const prassigneds2 = require("../Models/prassigneds2");
        const query = { colid };
        if (reqstatus) query.reqstatus = reqstatus;
        if (storeid) query.storeid = storeid;

        if (page && limit) {
            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);
            const skip = (pageNum - 1) * limitNum;

            const total = await storerequisationds2.countDocuments(query);
            let requisitions = await storerequisationds2.find(query)
                .sort({ reqdate: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean();

            const reqIds = requisitions.map(r => r._id);
            const assignments = await prassigneds2.find({ storereqid: { $in: reqIds } }).lean();
            requisitions = requisitions.map(r => {
                const assignment = assignments.find(a => String(a.storereqid) === String(r._id));
                if (assignment) r.assignedToName = assignment.prassignename;
                return r;
            });

            res.status(200).json({
                success: true,
                count: requisitions.length,
                total,
                data: { requisitions },
                pagination: {
                    total,
                    page: pageNum,
                    limit: limitNum,
                    pages: Math.ceil(total / limitNum)
                }
            });
        } else {
            let requisitions = await storerequisationds2.find(query).sort({ reqdate: -1 }).lean();
            
            const reqIds = requisitions.map(r => r._id);
            const assignments = await prassigneds2.find({ storereqid: { $in: reqIds } }).lean();
            requisitions = requisitions.map(r => {
                const assignment = assignments.find(a => String(a.storereqid) === String(r._id));
                if (assignment) r.assignedToName = assignment.prassignename;
                return r;
            });

            res.status(200).json({
                success: true,
                count: requisitions.length,
                data: { requisitions }
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching store requisitions",
            error: error.message
        });
    }
};

exports.updatestorerequisationds2 = async (req, res) => {
    try {
        const { id } = req.query;
        const updatedReq = await storerequisationds2.findByIdAndUpdate(id, req.body, { new: true });
        if (!updatedReq) return res.status(404).json({ success: false, message: "Requisition not found" });
        res.status(200).json({
            success: true,
            message: "Requisition updated",
            data: updatedReq
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error updating requisition",
            error: error.message
        });
    }
};

exports.deletestorerequisationds2 = async (req, res) => {
    try {
        const { id } = req.query;
        await storerequisationds2.findByIdAndDelete(id);
        res.status(200).json({ success: true, message: "Requisition deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error deleting requisition", error: error.message });
    }
};

exports.getstorerequisationdsbyid2 = async (req, res) => {
    try {
        const { id } = req.query;
        const reqData = await storerequisationds2.findById(id);
        if (!reqData) return res.status(404).json({ success: false, message: "Requisition not found" });
        res.status(200).json({ success: true, data: reqData });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching requisition", error: error.message });
    }
};
