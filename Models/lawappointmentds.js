const mongoose = require('mongoose');

const lawappointmentschema = new mongoose.Schema({
    colid: { type: Number, required: true },
    userid: { type: mongoose.Schema.Types.ObjectId, ref: 'lawuserds', required: true },
    useremail: { type: String, required: true },

    // New Appointment Fields
    name: { type: String, required: true },
    caseno: { type: String },
    date: { type: Date, required: true },
    thingstodo: { type: String, required: true },
    deliverydate: { type: Date },

    // Law Clerk Details
    lawclerkid: { type: String },
    lawclerkname: { type: String },
    lawclerkemail: { type: String },
    lawclerkphone: { type: String },

    isactive: { type: Boolean, default: true }
}, {
    timestamps: true
});

const lawappointmentds = mongoose.model("lawappointmentds", lawappointmentschema);
module.exports = lawappointmentds;
