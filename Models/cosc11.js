const mongoose = require('mongoose');

const cosc11schema = new mongoose.Schema({
    name: { type: String, required: true },
    user: { type: String, required: true },
    colid: { type: Number, required: true },
    student: { type: String },
    regno: { type: String },
    year: { type: String },
    semester: { type: String },
    areas: { type: String },
    grade: { type: String },
});

const cosc11 = mongoose.model('cosc11', cosc11schema);

module.exports = cosc11;