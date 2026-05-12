const mongoose = require("mongoose");

const lawuserdsschema = new mongoose.Schema({
  fullname: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  colid: { type: String, required: true },
  role: { type: String, default: "Sr. Lawyer" }, // "Sr. Lawyer", "Jr. Lawyer", "Law Clerk"
}, {
  timestamps: true
});

const lawuserds = mongoose.model("lawuserds", lawuserdsschema);
module.exports = lawuserds;
