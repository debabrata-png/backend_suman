const mongoose = require('mongoose');

const platformchargesdsschema = new mongoose.Schema({
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
    required: [true, 'Please enter colid'],
    unique: true 
  },
  
  institutionname: { 
    type: String, 
    required: [true, 'Please enter institution name'] 
  },
  
  chargetype: { 
    type: String, 
    required: [true, 'Please select charge type'], 
    enum: ['Fixed', 'Percentage', 'Hybrid'],
    default: 'Fixed' 
  },
  
  fixedcharge: { 
    type: Number, 
    required: true, 
    default: 0 
  },
  
  percentagecharge: { 
    type: Number, 
    required: true, 
    default: 0 
  },
  
  minimumcharge: { 
    type: Number, 
    default: 0 
  },
  
  maximumcharge: { 
    type: Number 
  },
  
  // GST configuration
  gstApplicable: { 
    type: Boolean, 
    default: true 
  },
  
  gstPercentage: { 
    type: Number, 
    default: 18 
  },
  
  // Who pays the charges
  chargeBearer: {
    type: String,
    enum: ['STUDENT', 'INSTITUTION', 'SHARED'],
    default: 'STUDENT',
    required: [true, 'Please select charge bearer']
  },
  
  // Payment type specific charges
  paymentTypeCharges: [{
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
      ]
    },
    chargetype: String,
    fixedcharge: Number,
    percentagecharge: Number,
    minimumcharge: Number,
    maximumcharge: Number
  }],
  
  // Effective date tracking
  effectiveFrom: { 
    type: Date, 
    required: [true, 'Please enter effective from date'], 
    default: Date.now 
  },
  
  effectiveTo: { 
    type: Date 
  },
  
  isActive: { 
    type: Boolean, 
    default: true 
  },
  
  notes: {
    type: String
  }
  
}, { timestamps: true });

// Index for active charges lookup
platformchargesdsschema.index({ colid: 1, isActive: 1, effectiveFrom: -1 });

// Method to calculate charge for an amount
platformchargesdsschema.methods.calculateCharge = function(amount, paymentType = null) {
  let charge = 0;
  let config = this;
  
  // Check if payment type specific charge exists
  if (paymentType && this.paymentTypeCharges && this.paymentTypeCharges.length > 0) {
    const typeConfig = this.paymentTypeCharges.find(ptc => ptc.paymentType === paymentType);
    if (typeConfig) {
      config = typeConfig;
    }
  }
  
  // Calculate based on charge type
  if (config.chargetype === 'Fixed' || config.chargetype === 'Hybrid') {
    charge += config.fixedcharge || 0;
  }
  
  if (config.chargetype === 'Percentage' || config.chargetype === 'Hybrid') {
    charge += (amount * (config.percentagecharge || 0)) / 100;
  }
  
  // Apply minimum charge
  if (config.minimumcharge && charge < config.minimumcharge) {
    charge = config.minimumcharge;
  }
  
  // Apply maximum charge cap
  if (config.maximumcharge && charge > config.maximumcharge) {
    charge = config.maximumcharge;
  }
  
  // Add GST if applicable
  let gstAmount = 0;
  if (this.gstApplicable) {
    gstAmount = (charge * this.gstPercentage) / 100;
  }
  
  return {
    baseCharge: parseFloat(charge.toFixed(2)),
    gstAmount: parseFloat(gstAmount.toFixed(2)),
    totalCharge: parseFloat((charge + gstAmount).toFixed(2))
  };
};

// Static method to get active charges for institution
platformchargesdsschema.statics.getActiveCharges = async function(colid) {
  return await this.findOne({
    colid,
    isActive: true,
    effectiveFrom: { $lte: new Date() },
    $or: [
      { effectiveTo: null },
      { effectiveTo: { $gte: new Date() }}
    ]
  });
};

const platformchargesds = mongoose.model('platformchargesds', platformchargesdsschema);

module.exports = platformchargesds;
