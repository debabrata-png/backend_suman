const mongoose = require('mongoose');

const sc11schema = new mongoose.Schema({
    name: { type: String, required: true },
    user: { type: String, required: true },
    colid: { type: Number, required: true },
    student: { type: String },
    regno: { type: String },
    year: { type: String },
    semester: { type: String },
    subject: { type: String },
    premid: { type: Number },
    postmid: { type: Number },
    a100: { type: Number },
    a20: { type: Number },
    bth: { type: Number },
    bse: { type: Number },
    b100: { type: Number },
    b30: { type: Number },
    cth: { type: Number },
    cp: { type: Number },
    c100: { type: Number },
    c50: { type: Number },
    total: { type: Number },
    grade: { type: String },
});

const sc11 = mongoose.model('sc11', sc11schema);

module.exports = sc11;