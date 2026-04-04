const mongoose = require("mongoose");

const dynamicquestionsdsschema = new mongoose.Schema({
    user: {type: String, required: true},
    colid: {type: Number, required: true},
    formatid: {type: mongoose.Schema.Types.ObjectId, ref: 'dynamicpaperformatds', required: true},
    questionbankcode: {type: String, required: true},
    nodeId: {type: String, required: true}, 
    questionNo: {type: Number, default: 0},
    partLabel: {type: String}, // e.g., 'a', 'b1', 'Q1.1'
    question: {type: String},
    translatedQuestion: {type: String}, // Bilingual support
    questiontype: {type: String, default: 'Descriptive'},
    marks: {type: Number},
    options: {type: [String]},
    answer: {type: String},
    translatedAnswer: {type: String}, // Bilingual support
    targetLanguageCode: {type: String}, // Tracking language
    isOrVariant: {type: Boolean, default: false},
    variantGroup: {type: String}, // To link parts that belong to the same "OR" variant
}, {timestamps: true});

const dynamicquestionsds = mongoose.model("dynamicquestionsds", dynamicquestionsdsschema);

module.exports = dynamicquestionsds;
