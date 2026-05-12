const mongoose = require('mongoose');

const MeritStudentSchema = new mongoose.Schema({
    rank: { type: Number, required: true },
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'StandardAdmission', required: true },
    fullName: { type: String, required: true },
    email: { type: String },
    mobileNo: { type: String },
    program: { type: String },
    scoreValue: { type: Number, default: 0 },
    scoreType: { type: String },
    applicationDate: { type: Date },
    seatStatus: { 
        type: String, 
        enum: ['Pending', 'Allotted', 'Declined', 'Waitlisted'], 
        default: 'Pending' 
    },
    seatStatusUpdatedAt: { type: Date }
});

const MeritListSchema = new mongoose.Schema({
    colid: { type: Number, required: true },
    programId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProgramCounselords', required: true },
    programName: { type: String, required: true },
    programCode: { type: String },
    academicYear: { type: String, required: true },
    meritListNumber: { type: Number, required: true, default: 1 },
    totalSeats: { type: Number, default: 0 },
    seatsAllotted: { type: Number, default: 0 },
    seatsRemaining: { type: Number, default: 0 },
    totalApplicants: { type: Number, default: 0 },
    tiebreaker: { type: String, enum: ['applicationDate', 'name'], default: 'applicationDate' },
    rankedBy: { type: String, default: 'hscDetails.scoreValue' },
    students: [MeritStudentSchema],
    generatedBy: { type: String },
    generatedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['Draft', 'Published', 'Archived'], default: 'Draft' }
}, {
    timestamps: true
});

// Compound index to prevent duplicate merit lists
MeritListSchema.index({ colid: 1, programId: 1, academicYear: 1, meritListNumber: 1 }, { unique: true });

const MeritList = mongoose.model('MeritList', MeritListSchema);
module.exports = MeritList;
