const mongoose = require('mongoose');

const StandardAdmissionSchema = new mongoose.Schema({
    // Step 0: Registration
    fullName: { type: String, required: true },
    mobileNo: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    academicYear: { type: String, required: true },
    programLevel: { type: String, required: true },
    school: { type: String, required: true },
    program: { type: String, required: true },
    programId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProgramCounselords' },
    password: { type: String, required: true },
    colid: { type: Number, required: true },

    // Step 1: Applicant & Address Details
    dob: { type: Date },
    gender: { type: String },
    nationality: { type: String },
    nationalityOther: { type: String },
    category: { type: String, enum: ['EWS', 'OBC', 'GENERAL', 'SBC', 'SC', 'ST'] },
    aadharNumber: { type: String },
    isMinority: { type: String, default: 'No' },
    isPhysicallyChallenged: { type: String, default: 'No' },
    religion: { type: String },
    whatsAppNumber: { type: String },
    isHostelRequired: { type: String, default: 'No' },
    
    // Guardian Details
    fatherName: { type: String },
    fatherEmail: { type: String },
    fatherMobile: { type: String },
    fatherProfession: { type: String },
    
    motherName: { type: String },
    motherEmail: { type: String },
    motherMobile: { type: String },
    motherOccupation: { type: String }, // User mentioned occupation
    motherProfession: { type: String },
    
    guardianName: { type: String },
    guardianEmail: { type: String },
    guardianMobile: { type: String },
    guardianOccupation: { type: String },
    guardianProfession: { type: String },
    
    familyIncome: { type: String, enum: ['Below 5L', '5L - 10L', 'Above 10L'] },
    applyForScholarship: { type: String, default: 'No' },
    entranceExamDetails: { type: String },
    
    // Address Details
    permanentAddress: {
        addressLine1: { type: String },
        country: { type: String },
        state: { type: String },
        district: { type: String },
        city: { type: String },
        pincode: { type: String },
        nationality: { type: String }
    },
    isCorrespondenceSameAsPermanent: { type: Boolean, default: true },
    correspondenceAddress: {
        addressLine1: { type: String },
        country: { type: String },
        state: { type: String },
        district: { type: String },
        city: { type: String },
        pincode: { type: String },
        nationality: { type: String }
    },

    // Step 2: Progamme Details and Academic Qualification
    sscDetails: {
        schoolName: { type: String },
        board: { type: String },
        passingYear: { type: String },
        scoreType: { type: String, enum: ['CGPA', 'Grade', 'Percentage'] },
        scoreValue: { type: String }
    },
    hscDetails: {
        stream: { type: String },
        board: { type: String },
        medium: { type: String },
        schoolName: { type: String },
        passingYear: { type: String },
        scoreType: { type: String },
        scoreValue: { type: String },
        isFromGujarat: { type: String, default: 'No' }
    },
    graduationDetails: {
        programme: { type: String },
        specialisation: { type: String },
        university: { type: String },
        college: { type: String },
        resultStatus: { type: String, enum: ['Declared', 'Awaited'] }
    },
    
    // Accolades
    achievements: { type: String },
    extraCurricular: { type: String },
    
    // Documents (URLs)
    documents: {
        studentPhoto: { type: String },
        marksheet10: { type: String },
        marksheet12: { type: String },
        leavingCertificate: { type: String },
        migrationCertificate: { type: String },
        casteCertificate: { type: String },
        aadharFront: { type: String },
        aadharBack: { type: String },
        gradSem1: { type: String },
        gradSem2: { type: String },
        gradSem3: { type: String },
        gradSem4: { type: String },
        gradSem5: { type: String },
        entranceExamResult: { type: String },
        ddcetCertificate: { type: String }
    },

    // Document Verification (OCR results)
    documentVerification: {
        studentPhoto: { verified: { type: Boolean, default: false }, confidence: { type: Number, default: 0 }, matchDetails: [String], verifiedAt: Date },
        marksheet10: { verified: { type: Boolean, default: false }, confidence: { type: Number, default: 0 }, matchDetails: [String], verifiedAt: Date },
        marksheet12: { verified: { type: Boolean, default: false }, confidence: { type: Number, default: 0 }, matchDetails: [String], verifiedAt: Date },
        leavingCertificate: { verified: { type: Boolean, default: false }, confidence: { type: Number, default: 0 }, matchDetails: [String], verifiedAt: Date },
        migrationCertificate: { verified: { type: Boolean, default: false }, confidence: { type: Number, default: 0 }, matchDetails: [String], verifiedAt: Date },
        casteCertificate: { verified: { type: Boolean, default: false }, confidence: { type: Number, default: 0 }, matchDetails: [String], verifiedAt: Date },
        aadharFront: { verified: { type: Boolean, default: false }, confidence: { type: Number, default: 0 }, matchDetails: [String], verifiedAt: Date },
        aadharBack: { verified: { type: Boolean, default: false }, confidence: { type: Number, default: 0 }, matchDetails: [String], verifiedAt: Date },
        entranceExamResult: { verified: { type: Boolean, default: false }, confidence: { type: Number, default: 0 }, matchDetails: [String], verifiedAt: Date },
        ddcetCertificate: { verified: { type: Boolean, default: false }, confidence: { type: Number, default: 0 }, matchDetails: [String], verifiedAt: Date }
    },

    // Step 5: SOP
    sop: { type: String },
    
    // Recruitment Info
    sourceOfInformation: { type: String },
    
    // Metadata
    currentStep: { type: Number, default: 0 },
    status: { type: String, enum: ['Draft', 'Submitted', 'Pending', 'Approved', 'Rejected', 'Hold'], default: 'Draft' },
    applicationFeeStatus: { type: String, enum: ['Unpaid', 'Paid', 'Pending'], default: 'Unpaid' },
    provisionalFeeStatus: { type: String, enum: ['Unpaid', 'Paid', 'Pending'], default: 'Unpaid' },
    applicationFeeTxnId: { type: String },
    provisionalFeeTxnId: { type: String },
    adminComments: { type: String },
    applicationDate: { type: Date, default: Date.now },
    decisionDate: { type: Date }
}, {
    timestamps: true
});

const StandardAdmission = mongoose.model('StandardAdmission', StandardAdmissionSchema);
module.exports = StandardAdmission;
