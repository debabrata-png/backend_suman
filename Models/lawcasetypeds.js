const mongoose = require("mongoose");

const lawcasetypedsschema = new mongoose.Schema({
  casetypename: { type: String, required: true },
  casetypecode: { type: String },
  colid: { type: Number, required: true },
  createduserid: { type: mongoose.Schema.Types.ObjectId, ref: 'lawuserds', required: true },
  createduseremail: { type: String, required: true },
  isactive: { type: Boolean, default: true }
}, {
  timestamps: true
});

const lawcasetypeds = mongoose.model("lawcasetypeds", lawcasetypedsschema);
module.exports = lawcasetypeds;
