const mongoose = require("mongoose");

const examattendancedsschema = mongoose.Schema({
    name: { type: String, required: true },
    user: { type: String, required: true },
    colid: { type: Number, required: true },
    studentname: { type: String },
    studentregno: { type: String },
    program: { type: String },
    programcode: { type: String },
    course: { type: String },
    coursecode: { type: String },
    exam: { type: String },
    examcode: { type: String },
    year: { type: String },
    roomname: { type: String },
    buildingname: { type: String },
    examdate: { type: Date },
    examtime: { type: String },
    ispresent: { type: String, default: 'true' },
    status: { type: String }
}, { timestamp: true });

const examattendanceds = mongoose.model("examattendanceds", examattendancedsschema);

module.exports = examattendanceds;
