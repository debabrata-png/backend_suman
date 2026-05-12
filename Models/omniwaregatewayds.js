const mongoose = require('mongoose');

const omniwaregatewaydsschema = new mongoose.Schema({
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
  apikey: {
    type: String,
    required: [true, 'Please enter API Key']
  },
  salt: {
    type: String,
    required: [true, 'Please enter Salt']
  },
  environment: {
    type: String,
    enum: ['test', 'prod'],
    default: 'test'
  },
  isactive: {
    type: Boolean,
    default: true
  },
  notes: {
    type: String
  }
}, { timestamps: true });

omniwaregatewaydsschema.index({ colid: 1 });
omniwaregatewaydsschema.index({ colid: 1, isactive: 1 });

const omniwaregatewayds = mongoose.models.omniwaregatewayds || mongoose.model('omniwaregatewayds', omniwaregatewaydsschema);
module.exports = omniwaregatewayds;
