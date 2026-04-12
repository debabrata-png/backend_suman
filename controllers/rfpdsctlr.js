const rfpds = require('../Models/rfpds');
const rfpsubmissionds = require('../Models/rfpsubmissionds');
const vendords = require('../Models/vendords');
const vendords2 = require('../Models/vendords2');
const gptapikeyds = require('../Models/gptapikeyds');
const { GoogleGenAI } = require('@google/genai');

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

exports.analyzeRfpAi = async (req, res) => {
    try {
        const { rfpid, colid, userPrompt } = req.body;

        if (!rfpid || !colid) {
            return res.status(400).json({ success: false, message: 'rfpid and colid are required' });
        }

        // 1. Fetch API Key for this colid
        const apiKeyDoc = await gptapikeyds.findOne({ colid });
        if (!apiKeyDoc) {
            return res.status(404).json({ success: false, message: 'API Key configuration not found for this institution' });
        }

        const apiKey = apiKeyDoc.usepersonalkey ? apiKeyDoc.personalapikey : apiKeyDoc.defaultapikey;
        if (!apiKey) {
            return res.status(400).json({ success: false, message: 'API Key is missing in configuration' });
        }

        // 2. Fetch RFP and Submissions
        const rfp = await rfpds.findById(rfpid);
        if (!rfp) return res.status(404).json({ success: false, message: 'RFP not found' });

        const submissions = await rfpsubmissionds.find({ rfpid });
        if (submissions.length === 0) {
            return res.status(400).json({ success: false, message: 'No submissions found for this RFP to analyze' });
        }

        // 3. Construct Context
        let context = `DOCUMENT TYPE: Request for Proposal (RFP) Analysis\n`;
        context += `RFP TITLE: ${rfp.title}\n`;
        context += `RFP DESCRIPTION: ${rfp.description}\n\n`;
        context += `VENDOR SUBMISSIONS:\n`;
        context += `--------------------------------------------------\n`;

        submissions.forEach((sub, index) => {
            context += `VENDOR ${index + 1}: ${sub.vendorname || sub.name}\n`;
            context += `TECHNICAL PROPOSAL: ${sub.technical_title || 'N/A'}\n`;
            context += `TECHNICAL DETAILS: ${sub.technical_description || 'No description provided'}\n`;
            context += `FINANCIAL QUOTE: ${sub.financial_amount ? `₹${sub.financial_amount}` : 'Not Disclosed'}\n`;
            context += `FINANCIAL DETAILS: ${sub.financial_description || 'No details'}\n`;
            context += `--------------------------------------------------\n`;
        });

        const finalPrompt = `
You are an expert procurement officer. I have provided details for an RFP and multiple vendor submissions.
Analyze these submissions based on the following user instructions:
"${userPrompt || 'Evaluate the vendors based on technical competency and cost-effectiveness.'}"

Please provide your response in the following format:
1. Executive Summary: A brief comparison of all vendors.
2. Vendor Scoring: A markdown table with columns: Vendor Name, Technical Score (1-10), Financial Score (1-10), Total Score (1-10), and Remarks.
3. Recommendation: Which vendor(s) should be prioritized and why.
`;

        // 4. Call Gemini API with Fallback Strategy
        const ai = new GoogleGenAI({ apiKey });
        const candidateModels = [
            "gemini-2.5-flash", 
            "gemini-1.5-flash-002", 
            "gemini-1.5-pro-002", 
            "gemini-1.5-flash-8b", 
            "gemini-1.5-flash-latest", 
            "gemini-2.0-flash", 
            "gemini-1.5-flash"
        ];
        let report = null;
        let lastError = null;

        for (const modelId of candidateModels) {
            try {
                // console.log(`Attempting AI Analysis with ${modelId}...`);
                const response = await ai.models.generateContent({
                    model: modelId,
                    contents: [
                        {
                            role: 'user',
                            parts: [
                                { text: context },
                                { text: finalPrompt }
                            ]
                        }
                    ]
                });

                if (response && response.text) {
                    report = response.text;
                    // console.log(`Successfully generated report with ${modelId}`);
                    break; 
                }
            } catch (aiError) {
                lastError = aiError;
                console.warn(`Model ${modelId} failed:`, aiError.message);
                // If it's a 429, wait briefly before trying the next one
                if (aiError.status === 429) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
                continue;
            }
        }

        if (!report) {
            console.error('All Gemini fallback models exhausted.');
            throw new Error(`AI analysis failed after multiple attempts. Last error: ${lastError ? lastError.message : 'Unknown'}`);
        }

        res.status(200).json({
            success: true,
            data: {
                report,
                analyzedCount: submissions.length
            }
        });

    } catch (error) {
        console.error('AI Analysis Error:', error);
        res.status(500).json({ success: false, message: 'AI Analysis failed', error: error.message });
    }
};
