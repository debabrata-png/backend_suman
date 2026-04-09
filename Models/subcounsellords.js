const mongoose = require("mongoose");

const subcounsellordsschema = new mongoose.Schema({
    name: { type: String, required: true },
    user: { type: String, required: true },
    colid: { type: Number, required: true },
    counsellorname: { type: String },
    counselloremail: { type: String },
    subcounsellorname: { type: String },
    subcounselloremail: { type: String },
    status: { type: String }
})

const subcounsellords = mongoose.model("subcounsellords", subcounsellordsschema);

module.exports = subcounsellords;