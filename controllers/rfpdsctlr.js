const rfpds = require('../Models/rfpds');
const rfpsubmissionds = require('../Models/rfpsubmissionds');
const vendords = require('../Models/vendords');
const vendords2 = require('../Models/vendords2');

// --- RFP Management (Admin) ---

exports.createrfp = async (req, res) => {
    try {
        const { colid, title, description } = req.body;
        
        if (!colid || !title || !description) {
            return res.status(400).json({ success: false, message: 'colid, title, and description are required' });
        }

        const newRfp = new rfpds({ colid, title, description });
        await newRfp.save();

        res.status(201).json({ success: true, message: 'RFP created successfully', data: newRfp });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error creating RFP', error: error.message });
    }
};

exports.getallrfps = async (req, res) => {
    try {
        const { colid } = req.query;
        if (!colid) return res.status(400).json({ success: false, message: 'colid is required' });

        const rfps = await rfpds.find({ colid }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: rfps.length, data: rfps });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching RFPs', error: error.message });
    }
};

exports.getrfpbyid = async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) return res.status(400).json({ success: false, message: 'id is required' });

        const rfp = await rfpds.findById(id);
        if (!rfp) return res.status(404).json({ success: false, message: 'RFP not found' });

        res.status(200).json({ success: true, data: rfp });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching RFP', error: error.message });
    }
};

// --- RFP Vendor Submissions (Public) ---

exports.submitrfp = async (req, res) => {
    try {
        const submissionData = req.body;
        
        // Auto-assign name and user if missing, to satisfy the schema
        if (!submissionData.name) submissionData.name = submissionData.vendorname || 'Unknown Vendor';
        if (!submissionData.user) submissionData.user = submissionData.email || 'unknown_user';

        if (!submissionData.rfpid || !submissionData.colid) {
            return res.status(400).json({ success: false, message: 'rfpid and colid are required' });
        }

        const submission = new rfpsubmissionds(submissionData);
        await submission.save();

        res.status(201).json({ success: true, message: 'RFP Submission successful', data: submission });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error submitting RFP', error: error.message });
    }
};

// --- Admin Submission Management ---

exports.getallrfpsubmissions = async (req, res) => {
    try {
        const { colid, sort } = req.query;
        if (!colid) return res.status(400).json({ success: false, message: 'colid is required' });

        let sortOption = { createdAt: -1 };
        if (sort === 'price_asc') sortOption = { financial_amount: 1 };
        if (sort === 'price_desc') sortOption = { financial_amount: -1 };

        const submissions = await rfpsubmissionds.find({ colid }).populate('rfpid', 'title description').sort(sortOption);
        res.status(200).json({ success: true, count: submissions.length, data: submissions });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching submissions', error: error.message });
    }
};

exports.approverfpsubmission = async (req, res) => {
    try {
        const { id } = req.query; // Submission ID
        const { name, user, colid } = req.body; // Extract from admin global1

        if (!id) return res.status(400).json({ success: false, message: 'Submission id is required' });
        if (!name || !user || !colid) return res.status(400).json({ success: false, message: 'Admin name, user, and colid are required' });

        const submission = await rfpsubmissionds.findById(id);
        if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });

        if (submission.status === 'Approved') {
            return res.status(400).json({ success: false, message: 'Submission is already approved' });
        }

        // Add to main vendords model using admin credentials
        const newVendorData = {
            name: name,
            user: user,
            colid: colid,
            vendorname: submission.vendorname,
            pan: submission.pan,
            gst: submission.gst,
            address: submission.address,
            state: submission.state,
            city: submission.city,
            mobileno: submission.mobileno,
            email: submission.email,
            type: submission.type || 'RFP Approved',
            payterm: submission.payterm,
            doclink: submission.doclink || submission.technical_documentlink || submission.financial_documentlink
        };

        const newVendor = new vendords(newVendorData);
        await newVendor.save();

        const newVendor2 = new vendords2(newVendorData);
        await newVendor2.save();

        // Update submission status
        submission.status = 'Approved';
        await submission.save();

        res.status(200).json({ success: true, message: 'Submission approved and vendor created successfully', vendor: newVendor });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error approving submission', error: error.message });
    }
};

exports.rejectrfpsubmission = async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) return res.status(400).json({ success: false, message: 'Submission id is required' });

        const submission = await rfpsubmissionds.findByIdAndUpdate(id, { status: 'Rejected' }, { new: true });
        if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });

        res.status(200).json({ success: true, message: 'Submission rejected successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error rejecting submission', error: error.message });
    }
};
