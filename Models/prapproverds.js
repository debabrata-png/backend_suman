const mongoose = require('mongoose');

const prapproverschema = new mongoose.Schema({
    colid: { type: Number, required: true },
    approvername: { type: String, required: true },
    approveruserid: { type: String, required: true }, // Email or User ID
    level: { type: Number, required: true }, // 1, 2, 3...
    status: { type: Number, default: 1 }, // 1 for Active, 0 for Inactive
    remarks: { type: String }
}, { timestamps: true });

// Compound index for unique level per colid
prapproverschema.index({ colid: 1, level: 1 }, { unique: true });

const prapproverds = mongoose.model('prapproverds', prapproverschema);
module.exports = prapproverds;
