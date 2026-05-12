const mongoose = require("mongoose");

const budgetapproverdsschema = new mongoose.Schema({
    name: { type: String, required: true },
    user: { type: String, required: true },
    colid: { type: Number, required: true },
    approvername: { type: String },
    approveremail: { type: String },
    levelofapproval: { type: String },
    approvaltype: { type: String, default: 'Global' }, // 'Global' or 'Department'
    department: { type: String },
    iscreateaccess: { type: Boolean },
    iseditaccess: { type: Boolean },
    isdeleteaccess: { type: Boolean },
    status: { type: String },
    remarks: { type: String }
})

const budgetapproverds = mongoose.model("budgetapproverds", budgetapproverdsschema);
module.exports = budgetapproverds;