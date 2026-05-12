const mongoose = require('mongoose');

const rfpsubmissiondsschema = new mongoose.Schema({
    rfpid: { type: mongoose.Schema.Types.ObjectId, ref: 'rfpds', required: true },
    colid: { type: Number, required: true },
    
    // Deriving from vendords2 fields
    name: { type: String, required: true }, 
    user: { type: String, required: true }, 
    vendorname: { type: String },
    pan: { type: String },
    gst: { type: String },
    address: { type: String },
    state: { type: String },
    city: { type: String },
    mobileno: { type: String },
    email: { type: String },
    type: { type: String },
    payterm: { type: String },
    doclink: { type: String },
    
    // Technical Requirement Section
    technical_title: { type: String },
    technical_description: { type: String },
    technical_documentlink: { type: String },
    
    // Financial Requirement Section
    financial_title: { type: String },
    financial_description: { type: String },
    financial_amount: { type: Number },
    financial_documentlink: { type: String },

    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },

    createdAt: { type: Date, default: Date.now }
});

const rfpsubmissionds = mongoose.model('rfpsubmissionds', rfpsubmissiondsschema);
module.exports = rfpsubmissionds;
