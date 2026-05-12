const mongoose = require("mongoose");

const lawcourtdsschema = new mongoose.Schema({
  courtname: { type: String, required: true },
  courtlocation: { type: String },
  colid: { type: Number, required: true },
  createduserid: { type: mongoose.Schema.Types.ObjectId, ref: 'lawuserds', required: true },
  createduseremail: { type: String, required: true },
  isactive: { type: Boolean, default: true }
}, {
  timestamps: true
});

const lawcourtds = mongoose.model("lawcourtds", lawcourtdsschema);
module.exports = lawcourtds;
