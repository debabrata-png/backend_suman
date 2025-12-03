const mongoose = require('mongoose');

const paymentorderdsschema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Please enter name'] 
  },
  
  user: { 
    type: String, 
    required: [true, 'Please enter user'] 
  },
  
  colid: { 
    type: Number, 
    required: [true, 'Please enter colid'] 
  },
  
  student: { 
    type: String, 
    required: [true, 'Please enter student'] 
  },
  
  regno: { 
    type: String, 
    required: [true, 'Please enter regno'] 
  },
  
  studentemail: { 
    type: String, 
    required: [true, 'Please enter student email'] 
  },
  
  studentphone: { 
    type: String, 
    required: [true, 'Please enter student phone'] 
  },
  
  // Order identification
  orderid: { 
    type: String, 
    required: [true, 'Please enter order ID'],
    unique: true 
  },
  
  merchantTransactionId: {
  type: String,
  required: [true, 'Please enter merchant transaction ID']
},
  
  phonePeOrderId: {
    type: String
  },
  
  phonePeTransactionId: {
    type: String
  },
  
  // Amount details
  originalAmount: { 
    type: Number, 
    required: [true, 'Please enter original amount'] 
  },
  
  discount: { 
    type: Number, 
    default: 0 
  },
  
  platformCharges: { 
    type: Number, 
    default: 0 
  },
  
  amount: { 
    type: Number, 
    required: [true, 'Please enter final amount'] 
  },
  
  // Payment type
  paymentType: {
    type: String,
    enum: [
      'SEMESTER_FEE',
      'EXAM_FEE',
      'ADMISSION_FEE',
      'HOSTEL_FEE',
      'LIBRARY_FEE',
      'REGISTRATION_FEE',
      'FINE',
      'OTHER'
    ],
    required: [true, 'Please select payment type']
  },
  
  paymentPurpose: { 
    type: String, 
    required: [true, 'Please enter payment purpose'] 
  },
  
  // Academic details
  academicYear: { 
    type: String 
  },
  
  semester: { 
    type: String 
  },
  
  course: { 
    type: String 
  },
  
  department: { 
    type: String 
  },
  
  programcode: {
    type: String
  },
  
  admissionyear: {
    type: String
  },
  
  // Payment status
  status: { 
    type: String, 
    required: [true, 'Please enter status'], 
    enum: ['INITIATED', 'PENDING', 'SUCCESS', 'FAILED', 'EXPIRED', 'CANCELLED'], 
    default: 'INITIATED' 
  },
  
  paymentMode: {
    type: String
  },
  
  // PhonePe response
  paymentDetails: {
    type: mongoose.Schema.Types.Mixed
  },
  
  // Coupon details
  couponApplied: { 
    type: Boolean, 
    default: false 
  },
  
  couponCode: { 
    type: String
  },
  
  couponId: { 
    type: String
  },
  
  // Timestamps
  initiatedAt: { 
    type: Date, 
    default: Date.now 
  },
  
  completedAt: { 
    type: Date 
  },
  
  expiresAt: { 
    type: Date 
  },
  
  // Ledger tracking
  ledgerEntryCreated: { 
    type: Boolean, 
    default: false 
  },
  
  ledgerEntryId: { 
    type: String
  },
  
  // URLs
  redirectUrl: { 
    type: String 
  },
  
  callbackUrl: { 
    type: String 
  },
  
  // Error details
  errorDetails: {
    type: mongoose.Schema.Types.Mixed
  },
  
  // Refund
  refund: {
    type: mongoose.Schema.Types.Mixed
  },
  
  // Fee details
  feegroup: {
    type: String
  },
  
  feeitem: {
    type: String
  },
  
  feecategory: {
    type: String
  },
  
  installment: {
    type: String
  },
  
  comments: {
    type: String
  },
  
  notes: {
    type: String
  }
  
}, { timestamps: true });

// Indexes
paymentorderdsschema.index({ colid: 1, status: 1, createdAt: -1 });
paymentorderdsschema.index({ regno: 1, colid: 1, createdAt: -1 });
paymentorderdsschema.index({ studentemail: 1 });

// Pre-save middleware
paymentorderdsschema.pre('save', async function(next) {
  if (this.isNew && this.status === 'INITIATED') {
    if (!this.expiresAt) {
      this.expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    }
  }
  next();
});

module.exports = mongoose.models.paymentorderds || mongoose.model('paymentorderds', paymentorderdsschema);
