const mongoose = require("mongoose");

const budgetauditlogschema = new mongoose.Schema({
    username: { type: String, required: true }, // From global1.name
    useremail: { type: String, required: true }, // From global1.user
    action: { type: String, required: true }, // e.g., "CREATE", "UPDATE", "DELETE", "APPROVE", "REJECT"
    module: { type: String, required: true }, // e.g., "BUDGET", "CATEGORY", "CONFIG"
    recordid: { type: mongoose.Types.ObjectId },
    budgetid: { type: mongoose.Types.ObjectId }, // Parent budget reference
    colid: { type: Number, required: true },
    details: { type: mongoose.Schema.Types.Mixed }, // metadata or remarks
    timestamp: { type: Date, default: Date.now },
    ip: { type: String }
});

const budgetauditlog = mongoose.model("budgetauditlog", budgetauditlogschema);
module.exports = budgetauditlog;
