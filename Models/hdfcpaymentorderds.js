const mongoose = require('mongoose');

const hdfcpaymentorderdsschema = new mongoose.Schema({
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
  
  // Student details
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
  merchanttransactionid: {
    type: String,
    required: [true, 'Please enter merchant transaction ID']
  },
  hdfcorderid: {
    type: String
    // HDFC/Juspay order ID from response
  },
  hdfctransactionid: {
    type: String
    // HDFC/Juspay transaction ID
  },
  hdfcpaymenturl: {
    type: String
    // Payment redirect URL from HDFC
  },
  
  // Amount details
  originalamount: {
    type: Number,
    required: [true, 'Please enter original amount']
  },
  discount: {
    type: Number,
    default: 0
  },
  platformcharges: {
    type: Number,
    default: 0
  },
  amount: {
    type: Number,
    required: [true, 'Please enter final amount']
  },
  
  // Payment type
  paymenttype: {
    type: String,
    required: [true, 'Please select payment type']
    // Values: 'SEMESTER_FEE', 'EXAM_FEE', 'ADMISSION_FEE', 
    // 'HOSTEL_FEE', 'LIBRARY_FEE', 'REGISTRATION_FEE', 'FINE', 'OTHER'
  },
  paymentpurpose: {
    type: String,
    required: [true, 'Please enter payment purpose']
  },
  
  // Academic details
  academicyear: {
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
    default: 'INITIATED'
    // Values: 'INITIATED', 'PENDING', 'CHARGED', 'SUCCESS', 'FAILED', 
    // 'EXPIRED', 'CANCELLED', 'AUTHORIZATION_FAILED', 'AUTHENTICATION_FAILED',
    // 'PENDING_VBV'
  },
  state: {
    type: String
    // HDFC/Juspay state from response
  },
  paymentmode: {
    type: String
    // Payment instrument type (UPI, CARD, NETBANKING, etc.)
  },
  
  // HDFC response details
  paymentdetails: {
    type: mongoose.Schema.Types.Mixed
    // Complete response from HDFC gateway
  },
  paymentinstrument: {
    type: mongoose.Schema.Types.Mixed
    // Payment instrument details from HDFC
  },
  
  // Coupon details
  couponapplied: {
    type: Boolean,
    default: false
  },
  couponcode: {
    type: String
  },
  couponid: {
    type: String
  },
  
  // Timestamps
  initiatedat: {
    type: Date,
    default: Date.now
  },
  completedat: {
    type: Date
  },
  failedat: {
    type: Date
  },
  expiresat: {
    type: Date
  },
  
  // Ledger tracking
  ledgerentrycreated: {
    type: Boolean,
    default: false
  },
  ledgerentryid: {
    type: String
  },
  
  // URLs
  redirecturl: {
    type: String
  },
  callbackurl: {
    type: String
  },
  
  // Error details
  errordetails: {
    type: mongoose.Schema.Types.Mixed
  },
  errorcode: {
    type: String
  },
  errormessage: {
    type: String
  },
  
  // Refund information
  refund: {
    type: mongoose.Schema.Types.Mixed
  },
  refundstatus: {
    type: String
  },
  refundamount: {
    type: Number
  },
  refundrequestid: {
    type: String
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
  frontendcallbackurl: { type: String },
  
  // Additional information
  comments: {
    type: String
  },
  notes: {
    type: String
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
    // Any additional metadata
  }
}, { timestamps: true });

// Indexes for performance
hdfcpaymentorderdsschema.index({ colid: 1, status: 1, createdAt: -1 });
hdfcpaymentorderdsschema.index({ regno: 1, colid: 1, createdAt: -1 });
hdfcpaymentorderdsschema.index({ studentemail: 1 });
hdfcpaymentorderdsschema.index({ orderid: 1 });
hdfcpaymentorderdsschema.index({ merchanttransactionid: 1 });
hdfcpaymentorderdsschema.index({ hdfcorderid: 1 });
hdfcpaymentorderdsschema.index({ hdfctransactionid: 1 });
hdfcpaymentorderdsschema.index({ colid: 1, regno: 1, status: 1 });
hdfcpaymentorderdsschema.index({ colid: 1, paymenttype: 1, createdAt: -1 });

// Pre-save middleware
hdfcpaymentorderdsschema.pre('save', async function(next) {
  if (this.isNew && this.status === 'INITIATED') {
    if (!this.expiresat) {
      // Set expiry to 30 minutes from now
      this.expiresat = new Date(Date.now() + 30 * 60 * 1000);
    }
  }
  next();
});

const hdfcpaymentorderds = mongoose.model('hdfcpaymentorderds', hdfcpaymentorderdsschema);
module.exports = hdfcpaymentorderds;