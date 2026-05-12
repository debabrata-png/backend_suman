const mongoose = require('mongoose');

const hdfcgatewaydsschema = new mongoose.Schema({
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
  merchantid: {
    type: String,
    required: [true, 'Please enter merchant ID']
  },
  apikey: {
    type: String,
    required: [true, 'Please enter API key']
  },
  paymentpageclientid: {
    type: String,
    required: [true, 'Please enter payment page client ID'],
    default: 'hdfcmaster'
  },
  responsekey: {
    type: String,
    required: [true, 'Please enter response key']
  },
  baseurl: {
    type: String,
    required: [true, 'Please enter base URL']
    // Values: 'https://smartgateway.hdfcuat.bank.in' (UAT) 
    // or 'https://smartgateway.hdfc.bank.in' (Production)
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
    default: 'UAT'
    // Values: 'UAT' or 'PRODUCTION'
  },
  isactive: {
    type: Boolean,
    default: true
  },
  enablelogging: {
    type: Boolean,
    default: true
  },
  loggingpath: {
    type: String,
    default: './logs/hdfcpaymenthandler.log'
  },
  notes: {
    type: String
  }
}, { timestamps: true });

// Indexes
hdfcgatewaydsschema.index({ colid: 1 });
hdfcgatewaydsschema.index({ colid: 1, isactive: 1 });
hdfcgatewaydsschema.index({ merchantid: 1 });

const hdfcgatewayds = mongoose.model('hdfcgatewayds', hdfcgatewaydsschema);
module.exports = hdfcgatewayds;