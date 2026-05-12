const mongoose = require("mongoose");

const budgetpodsschema = new mongoose.Schema({
    name: { type: String, required: true },
    user: { type: String, required: true },
    colid: { type: Number, required: true },
    budgetid: { type: String },
    budgetname: { type: String },
    year: { type: String },
    department: { type: String },
    amount: { type: Number },
    budgettype: { type: String },
    approvedby: [{
        approvername: { type: String },
        approveremail: { type: String },
        levelofapproval: { type: Number },
        status: { type: String },
        date: { type: Date }
    }],
    currentlevel: { type: Number, default: 0 },
    finallevel: { type: Number },
    institution: { type: String },
    status: { type: String, default: 'Draft' },
    remarks: { type: String }
})

const budgetpods = mongoose.model("budgetpods", budgetpodsschema);
module.exports = budgetpods;