const mongoose = require('mongoose');

const classtremarksdsSchema = new mongoose.Schema({
    remark: { type: String, required: true },
    colid: { type: Number, required: true },
    isactive: { type: Boolean, default: true },
    createdat: { type: Date, default: Date.now },
    updatedat: { type: Date, default: Date.now }
});

// Index for faster queries by colid
classtremarksdsSchema.index({ colid: 1 });

const classtremarksds = mongoose.model('classtremarksds', classtremarksdsSchema);

module.exports = classtremarksds;
