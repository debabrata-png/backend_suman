const mongoose = require('mongoose');

const sc9schema = new mongoose.Schema({
    name: { type: String, required: true },
    user: { type: String, required: true },
    colid: { type: Number, required: true },
    student: { type: String },
    regno: { type: String },
    year: { type: String },
    semester: { type: String },
    subject: { type: String },
    pt: { type: Number },
    nb: { type: Number },
    se: { type: Number },
    mte: { type: Number },
    mo: { type: Number },
    grade: { type: String },
    term: { type: String },
});

const sc9 = mongoose.model('sc9', sc9schema);

module.exports = sc9;