const mongoose = require("mongoose");

const pgmasterdsschema = new mongoose.Schema({
    name: { type: String, required: true },
    user: { type: String, required: true },
    colid: { type: Number, required: true },
    gatwayname: { type: String, required: true },
    accountno: { type: String },
    accountname: { type: String },
    api: { type: String },
    isactive: { type: Boolean, default: true },
    environment: { type: String, default: 'UAT' }
}, { timestamps: true });

const pgmasterds = mongoose.models.pgmasterds || mongoose.model("pgmasterds", pgmasterdsschema);
module.exports = pgmasterds;
