const mongoose = require('mongoose');

const lawopponentlawyerdsSchema = new mongoose.Schema({
    name: { type: String, required: true }, // logged-in user name
    user: { type: String, required: true }, // logged-in user email
    colid: { type: Number, required: true },
    opplawyername: { type: String, required: true },
    opplawyeremail: { type: String },
    opplawyerphone: { type: String },
    opplawyeraddress: { type: String },
    isactive: { type: Boolean, default: true }
}, {
    timestamps: true
});

const lawopponentlawyerds = mongoose.model("lawopponentlawyerds", lawopponentlawyerdsSchema);
module.exports = lawopponentlawyerds;
