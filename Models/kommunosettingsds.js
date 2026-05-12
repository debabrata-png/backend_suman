const mongoose = require('mongoose');

const kommunosettingsdsschema = new mongoose.Schema({
    colid: { type: Number, required: true },
    user: { type: String, required: true }, // Admin email who configured this
    smeId: { type: String, required: true },
    accessToken: { type: String, required: true },
    accessKey: { type: String, required: true },
    pilotNumber: { type: String, required: true },
    baseUrl: { type: String, default: 'https://api.kommuno.com' } // Default if not provided
}, {
    timestamps: true
});

const Kommunosettingsds = mongoose.model('kommunosettingsds', kommunosettingsdsschema);
module.exports = Kommunosettingsds;
