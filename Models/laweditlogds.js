const mongoose = require("mongoose");

const laweditlogdsschema = new mongoose.Schema({
  caseid: { type: mongoose.Schema.Types.ObjectId, ref: 'lawformds', required: true },
  caseno: { type: String },
  editedby: { type: String, required: true },
  editedbyemail: { type: String, required: true },
  editeduserid: { type: mongoose.Schema.Types.ObjectId, ref: 'lawuserds', required: true },
  edittype: { type: String, required: true }, // 'update' or 'delete'
  edittype: { type: String, required: true }, // 'update' or 'delete'
  changedsummary: { type: String },
  nextdateforhearing: { type: Date },
  nextdateforhearingtime: { type: String },
  datefor: { type: Array },
  olddatajson: { type: Object },
  newdatajson: { type: Object },
  colid: { type: Number, required: true }
}, {
  timestamps: true
});

const laweditlogds = mongoose.model("laweditlogds", laweditlogdsschema);
module.exports = laweditlogds;
