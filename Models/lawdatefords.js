const mongoose = require('mongoose');

const lawdatefordsSchema = new mongoose.Schema({
    dateforname: { type: String, required: true },
    colid: { type: Number, required: true },
    createduserid: { type: String },
    createduseremail: { type: String },
    isactive: { type: Boolean, default: true }
}, {
    timestamps: true
});

const lawdatefords = mongoose.model("lawdatefords", lawdatefordsSchema);
module.exports = lawdatefords;
