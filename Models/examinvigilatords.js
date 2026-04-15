const mongoose = require("mongoose");

const examinvigilatordsschema = mongoose.Schema({
    name: { type: String, required: true },
    user: { type: String, required: true },
    colid: { type: Number, required: true },
    invigilatorname: { type: String },
    invigilatoremail: { type: String },
    exam: { type: String },
    examcode: { type: String },
    year: { type: String },
    roomname: { type: String },
    buildingname: { type: String },
    examdate: { type: Date },
    examtime: { type: String },
    status: { type: String }
}, { timestamp: true });

const examinvigilatords = mongoose.model("examinvigilatords", examinvigilatordsschema);

module.exports = examinvigilatords;