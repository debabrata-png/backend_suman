const mongoose = require("mongoose");

const dynamicpaperformatdsschema = new mongoose.Schema({
    user: {type: String, required: true},
    colid: {type: Number, required: true},
    questionbankcode: {type: String, required: true},
    structure: {type: mongoose.Schema.Types.Mixed, required: true}, // Flexible array of questions and logic
    totalmarks: {type: Number},
    instructions: {type: String},
}, {timestamps: true});

const dynamicpaperformatds = mongoose.model("dynamicpaperformatds", dynamicpaperformatdsschema);

module.exports = dynamicpaperformatds;
