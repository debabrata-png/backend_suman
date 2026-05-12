const mongoose = require('mongoose');

const ttSubjectLoadSchema = new mongoose.Schema({
  facultyId: String,
  subject: String,
  program: String,
  semester: Number,
  classesPerWeek: Number,
  colid:Number
});

module.exports = mongoose.model('ttSubjectLoad', ttSubjectLoadSchema);