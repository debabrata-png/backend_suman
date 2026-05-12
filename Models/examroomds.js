const mongoose = require("mongoose");

const examschooldsschema = mongoose.Schema({
    name: { type: String, required: true },
    user: { type: String, required: true },
    colid: { type: Number, required: true },
    exam: { type: String },
    examcode: { type: String },
    year: { type: String },
    roomname: { type: String },
    buildingname: { type: String },
    examdate: { type: String },
    status: { type: String }
}, { timestamp: true });

const examsroomds = mongoose.model("examroomds", examschooldsschema);

module.exports = examsroomds;