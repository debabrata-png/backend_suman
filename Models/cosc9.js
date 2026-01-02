const mongoose = require('mongoose');

const cosc9schema = new mongoose.Schema({
    name: { type: String, required: true },
    user: { type: String, required: true },
    colid: { type: Number, required: true },
    student: { type: String },
    regno: { type: String },
    year: { type: String },
    semester: { type: String },
    areas: { type: String },
    grade: { type: String },
    term: { type: String },
});

const cosc9 = mongoose.model('cosc9', cosc9schema);

module.exports = cosc9;