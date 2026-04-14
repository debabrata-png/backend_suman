const mongoose = require('mongoose');

const ttTimeSlotSchema = new mongoose.Schema({
  day: String,
  startTime: String,
  endTime: String,
  colid: Number
});

module.exports = mongoose.model('ttTimeSlot', ttTimeSlotSchema);