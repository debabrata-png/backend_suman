const mongoose = require('mongoose');

const marksheetdatadsschema = new mongoose.Schema({
  name: { type: String, required: true },
  user: { type: String, required: true },
  colid: { type: Number, required: true },
  regno: { type: String, required: true },
  academicyear: { type: String, required: true },
  semester: { type: String, required: true },
  programcode: { type: String, required: true },
  classtype: { type: String, required: true },
  
  // Scholastic subjects - array of subjects with term-wise marks
  subjects: [{
    subjectname: { type: String, required: true },
    subjectcode: { type: String },
    
    // Term I
    term1PeriodicTest: { type: Number, default: 0 }, // Max 10
    term1Notebook: { type: Number, default: 0 }, // Max 5
    term1Enrichment: { type: Number, default: 0 }, // Max 5
    term1MidExam: { type: Number, default: 0 }, // Max 80
    term1Total: { type: Number, default: 0 }, // Auto calculated
    term1Grade: { type: String, default: '' },
    term1periodictestabsent: { type: Boolean, default: false },
    term1midexamabsent: { type: Boolean, default: false },
    
    // Term II
    term2PeriodicTest: { type: Number, default: 0 }, // Max 10
    term2Notebook: { type: Number, default: 0 }, // Max 5
    term2Enrichment: { type: Number, default: 0 }, // Max 5
    term2AnnualExam: { type: Number, default: 0 }, // Max 80
    term2Total: { type: Number, default: 0 }, // Auto calculated
    term2Grade: { type: String, default: '' },
    term2periodictestabsent: { type: Boolean, default: false },
    term2annualexamabsent: { type: Boolean, default: false },
    
    // Additional absent fields
    unitpremidabsent: { type: Boolean, default: false },
    unitpostmidabsent: { type: Boolean, default: false },
    halfyearlythabsent: { type: Boolean, default: false },
    halfyearlypracticalabsent: { type: Boolean, default: false },
    annualthabsent: { type: Boolean, default: false },
    annualpracticalabsent: { type: Boolean, default: false },
    
    isgrace: { type: Boolean, default: false }
  }],
  
  // Co-scholastic areas
  coScholastic: [{
    area: { type: String, required: true },
    isgrace: { type: Boolean, default: false },
    isabsent: { type: Boolean, default: false },
    status: { type: String, default: 'active' },
  }],
  
  // Overall assessment
  term1TotalMarks: { type: Number, default: 0 },
  term2TotalMarks: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },
  percentage: { type: Number, default: 0 },
  overallGrade: { type: String, default: '' },
  rank: { type: Number },
  
  // Class teacher remarks
  remarks: { type: String, default: '' },
  
  // Promotion details
  promotedToClass: { type: String, default: '' },
  newSessionDate: { type: String, default: '' },
  
  // Status
  status: { type: String, enum: ['draft', 'finalized'], default: 'draft' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const marksheetdatads = mongoose.model('marksheetdatads', marksheetdatadsschema);
module.exports = marksheetdatads;
