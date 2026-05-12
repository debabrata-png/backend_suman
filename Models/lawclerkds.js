const mongoose = require("mongoose");

const lawclerkdsschema = new mongoose.Schema({
  clerkname: { type: String, required: true },
  clerkemail: { type: String, required: true },
  clerkphone: { type: String, required: true },
  colid: { type: Number, required: true },
  createduserid: { type: mongoose.Schema.Types.ObjectId, ref: 'lawuserds', required: true },
  createduseremail: { type: String, required: true },
  isactive: { type: Boolean, default: true }
}, {
  timestamps: true
});

const lawclerkds = mongoose.model("lawclerkds", lawclerkdsschema);
module.exports = lawclerkds;
