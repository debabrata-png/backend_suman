const mongoose=require('mongoose');

const ttFacultySchema = new mongoose.Schema({
    colid: Number,
    name: String,
    availableDays: [String]
  });

module.exports = mongoose.model('ttFaculty', ttFacultySchema);