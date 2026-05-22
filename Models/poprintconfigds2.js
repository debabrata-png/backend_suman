const mongoose = require('mongoose');

const poprintconfigschema = new mongoose.Schema({
    configname: { type: String, required: true },
    institutionname: { type: String },
    address: { type: String },
    phone: { type: String },
    shortname: { type: String },
    colid: { type: String, required: true },
    user: { type: String, required: true },
    status: { type: String, default: 'Active' }
}, {
    timestamps: true
});

const poprintconfigds2 = mongoose.model('poprintconfigds2', poprintconfigschema);
module.exports = poprintconfigds2;
