const mongoose = require('mongoose');

const attendanceSettingSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true 
  },
  colid: { 
    type: Number, 
    required: true,
    unique: true 
  },
  officeStartTime: { 
    type: String, 
    default: '09:00' 
  },
  officeEndTime: { 
    type: String, 
    default: '18:00' 
  },
  gracePeriodMinutes: { 
    type: Number, 
    default: 15 
  },
  halfDayHours: { 
    type: String, 
    default: '4' 
  },
  autoDeductLeave: { 
    type: Boolean, 
    default: true 
  },
  deductSalaryIfNoLeave: { 
    type: Boolean, 
    default: true 
  },
  dailyDeductionAmount: { 
    type: String, 
    default: '1666.67' 
  },
  halfDayDeductionAmount: {
    type: String,
    default: '833.33'
  },
  fullDayDeductionAmount: {
    type: String,
    default: '1666.67'
  },
  lunchBreakMinutes: {
    type: Number,
    default: 60
  },
  workingDaysPerMonth: {
    type: Number,
    default: 22
  },
  minimumWorkingHours: {
    type: Number,
    default: 8
  },
  enableLateMarkingAfterMinutes: {
    type: Number,
    default: 30
  },
  autoMarkAbsentAfterHours: {
    type: Number,
    default: 2
  },
  overtimeRatePerHour: {
    type: Number,
    default: 100
  },
  enableOvertimeCalculation: {
    type: Boolean,
    default: false
  },
  enableAutomaticAbsent: {
    type: Boolean,
    default: false
  },
  weeklyOffDays: {
    type: [String],
    default: ['Sunday']
  },
  requireLocationTracking: {
    type: Boolean,
    default: true
  },
  enableBreakTime: {
    type: Boolean,
    default: false
  },
  enableHalfDayPolicy: {
    type: Boolean,
    default: true
  },
  enableFullDayPolicy: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

const AttendanceSettingds = mongoose.model('attendancesettingds', attendanceSettingSchema);
module.exports = AttendanceSettingds;
