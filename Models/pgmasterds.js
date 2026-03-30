const mongoose = require("mongoose");

const pgmasterdsschema = new mongoose.Schema({
    name: { type: String, required: true },
    user: { type: String, required: true },
    colid: { type: Number, required: true },
    gatwayname: { type: String },
    accountno: { type: String },
    accountname: { type: String }
})