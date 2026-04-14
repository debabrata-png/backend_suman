const mongoose = require('mongoose');

const ttTimetableSchema = new mongoose.Schema({
  day: String,
  colid: Number,
  slotId: String,
  facultyId: String,
  subject: String,
  program: String,
  semester: Number,
  faculty: String,
  starttime:String,
  endtime:String
});

module.exports = mongoose.model('ttTimetable', ttTimetableSchema);