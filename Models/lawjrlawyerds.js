const mongoose = require("mongoose");

const lawjrlawyerdsschema = new mongoose.Schema({
  jrlawyername: { type: String, required: true },
  jrlawyeremail: { type: String, required: true },
  jrlawyerphone: { type: String, required: true },
  colid: { type: Number, required: true },
  createduserid: { type: mongoose.Schema.Types.ObjectId, ref: 'lawuserds', required: true },
  createduseremail: { type: String, required: true },
  isactive: { type: Boolean, default: true }
}, {
  timestamps: true
});

const lawjrlawyerds = mongoose.model("lawjrlawyerds", lawjrlawyerdsschema);
module.exports = lawjrlawyerds;
