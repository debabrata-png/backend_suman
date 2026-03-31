const mongoose = require('mongoose');

const rfpdsschema = new mongoose.Schema({
    colid: { type: Number, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

const rfpds = mongoose.model('rfpds', rfpdsschema);
module.exports = rfpds;
