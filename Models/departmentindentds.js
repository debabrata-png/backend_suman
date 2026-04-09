const mongoose = require("mongoose");

const departmentindentdsschema = new mongoose.Schema({
    name: { type: String, required: true },
    user: { type: String, required: true },
    colid: { type: Number, required: true },
    departmentname: { type: String },
    creatorname: { type: String },
    creatoruserid: { type: String },
    hoiapprovername: { type: String },
    hoiapproveruserid: { type: String },
    ahoiapprovername: { type: String },
    ahoiapproveruserid: { type: String },
    institution: { type: String },
    institutionshort: { type: String },
    status: { type: String },
    remarks: { type: String }
}, { timestamps: true });


const departmentindentds = mongoose.model("departmentindentds", departmentindentdsschema);

module.exports = departmentindentds;
