const multer = require('multer');
const path = require('path');
const fs = require('fs');
const StandardAdmission = require('../Models/standardadmissionds');

// ── Multer Disk Storage Configuration ──────────────────────────────────
const multerStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const appId = req.body.applicationId || 'unknown';
        const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'admission', appId);
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const docType = req.body.docType || 'document';
        const ext = path.extname(file.originalname);
        const uniqueName = `${docType}_${Date.now()}${ext}`;
        cb(null, uniqueName);
    }
});

const multerFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only images (JPEG, PNG, WebP) and PDF files are allowed'), false);
    }
};

const upload = multer({
    storage: multerStorage,
    fileFilter: multerFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

exports.uploadMiddleware = upload.single('document');

// ── Upload Endpoint (OCR verification is done on the frontend) ─────────
exports.uploadAdmissionDocument = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const { applicationId, docType } = req.body;

        if (!applicationId || !docType) {
            // Clean up uploaded file
            if (req.file.path) fs.unlinkSync(req.file.path);
            return res.status(400).json({ success: false, message: 'applicationId and docType are required' });
        }

        // Parse verification data sent from frontend (OCR done in browser)
        let verificationResult = {
            verified: false,
            confidence: 0,
            matchDetails: []
        };

        try {
            if (req.body.verificationResult) {
                verificationResult = JSON.parse(req.body.verificationResult);
            }
        } catch (e) {
            console.warn('Could not parse verification result:', e.message);
        }

        // Build the public URL for the file
        const relativePath = req.file.path.split('public')[1].replace(/\\/g, '/');
        const fileUrl = `/public${relativePath}`;

        // Update the application in database
        const updateFields = {};
        updateFields[`documents.${docType}`] = fileUrl;
        updateFields[`documentVerification.${docType}`] = {
            verified: verificationResult.verified,
            confidence: verificationResult.confidence,
            matchDetails: verificationResult.matchDetails,
            verifiedAt: new Date()
        };

        await StandardAdmission.findByIdAndUpdate(applicationId, {
            $set: updateFields
        });

        res.status(200).json({
            success: true,
            message: verificationResult.verified 
                ? 'Document uploaded and verified successfully' 
                : 'Document uploaded but verification could not confirm match',
            data: {
                fileUrl: fileUrl,
                fileName: req.file.filename,
                originalName: req.file.originalname,
                size: req.file.size,
                docType: docType,
                verification: verificationResult
            }
        });

    } catch (err) {
        console.error('Upload Error:', err);
        // Clean up file on error
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ success: false, message: err.message });
    }
};

// ── Delete Document Endpoint ───────────────────────────────────────────
exports.deleteAdmissionDocument = async (req, res) => {
    try {
        const { appId, docType } = req.params;

        const application = await StandardAdmission.findById(appId);
        if (!application) {
            return res.status(404).json({ success: false, message: 'Application not found' });
        }

        const fileUrl = application.documents?.[docType];
        if (fileUrl) {
            // Convert URL back to filesystem path
            const filePath = path.join(__dirname, '..', fileUrl.replace(/^\/public/, 'public'));
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        // Clear from database
        const updateFields = {};
        updateFields[`documents.${docType}`] = '';
        updateFields[`documentVerification.${docType}`] = {
            verified: false,
            confidence: 0,
            matchDetails: [],
            verifiedAt: null
        };

        await StandardAdmission.findByIdAndUpdate(appId, { $set: updateFields });

        res.status(200).json({
            success: true,
            message: 'Document deleted successfully'
        });

    } catch (err) {
        console.error('Delete Document Error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};
