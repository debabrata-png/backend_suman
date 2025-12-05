const mongoose = require('mongoose');

const lawopponentclerkdsSchema = new mongoose.Schema({
    name: { type: String, required: true }, // logged-in user name
    user: { type: String, required: true }, // logged-in user email
    colid: { type: Number, required: true },
    oppclerkname: { type: String, required: true },
    oppclerkemail: { type: String },
    oppclerkphone: { type: String },
    oppclerkaddress: { type: String },
    isactive: { type: Boolean, default: true }
}, {
    timestamps: true
});

const lawopponentclerkds = mongoose.model("lawopponentclerkds", lawopponentclerkdsSchema);
module.exports = lawopponentclerkds;
