const mongoose = require('mongoose');

const lawformschema = new mongoose.Schema({
  slno: { type: String, required: true },
  userid: { type: mongoose.Schema.Types.ObjectId, ref: 'lawuserds', required: true },
  useremail: { type: String, required: true },
  courtname: { type: String, required: true },
  caseregtype: { type: String, required: true },
  caseno: { type: String },
  partyname: { type: String },
  plaintiffname: { type: String },
  defendantname: { type: String },
  jrlawyer: [{
    name: { type: String },
    email: { type: String },
    phno: { type: String }
  }],
  clientphnop: { type: String },
  clientphnos: { type: String },
  cisno: { type: String },
  cnrno: { type: String },
  nextdateforhearing: { type: Date },
  nextdateforhearingtime: { type: String },
  datefor: { type: String },
  ispetitionhearing: { type: Boolean, default: false },
  petitionhearingdate: { type: Date },
  petitionhearingtime: { type: String },
  lawclerkname: { type: String },
  lawclerkemail: { type: String },
  lawclerkphno: { type: String },
  opponentlawyername: { type: String },
  opponentlawyeremail: { type: String },
  opponentlawyerphone: { type: String },
  opponentclerkname: { type: String },
  opponentclerkemail: { type: String },
  opponentclerkphone: { type: String },
  rackno: { type: String },
  colid: { type: Number, required: true }
}, {
  timestamps: true
});

const lawformds = mongoose.model("lawformds", lawformschema);
module.exports = lawformds;
