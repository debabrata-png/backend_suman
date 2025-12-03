const mongoose = require('mongoose');

const paymentgatewaydsschema = new mongoose.Schema({
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
  
  institutionname: { 
    type: String, 
    required: [true, 'Please enter institution name'] 
  },
  
  marchentid: { 
    type: String, 
    required: [true, 'Please enter merchant ID'] 
  },
  
  saltkey: { 
    type: String, 
    required: [true, 'Please enter salt key'] 
  },
  
  saltindex: { 
    type: String, 
    required: [true, 'Please enter salt index'] 
  },
  
  callbackurl: { 
    type: String, 
    required: [true, 'Please enter callback URL'] 
  },
  
  webhookurl: { 
    type: String 
  },
  
  environment: { 
    type: String, 
    enum: ['UAT', 'PRODUCTION'], 
    default: 'UAT' 
  },
  
  isActive: { 
    type: Boolean, 
    default: true 
  },
  
  // TSP fields
  isTSP: {
    type: Boolean,
    default: false
  },
  
  tspClientId: {
    type: String
  },
  
  tspClientSecret: {
    type: String
  },
  
  tspClientVersion: {
    type: String
  },
  
  notes: { 
    type: String 
  }
  
}, { timestamps: true });

paymentgatewaydsschema.index({ colid: 1 });

module.exports = mongoose.models.paymentgatewayds || mongoose.model('paymentgatewayds', paymentgatewaydsschema);
