const mongoose = require('mongoose');

const hostelstudremarksdsschema = new mongoose.Schema({
    name: { type: String, required: true },
    user: { type: String, required: true },
    colid: { type: Number, required: true },
    student: { type: String },
    regno: { type: String },
    remarks: { type: String },
    isredflag: { type: Boolean, default: false },
}, { timestamps: true });

const hostelstudremarksds = mongoose.model('hostelstudremarksds', hostelstudremarksdsschema);

module.exports = hostelstudremarksds;
