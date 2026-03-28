const mongoose = require('mongoose');

const challanconfigschema = new mongoose.Schema({
    colid: {
        type: Number,
        required: [true, 'Please enter colid'],
        unique: false
    },
    configName: {
        type: String,
        required: [true, 'Please enter configuration name']
    },
    bankName: {
        type: String,
        required: [true, 'Please enter bank name']
    },
    accountNo: {
        type: String,
        required: [true, 'Please enter account number']
    },
    branch: {
        type: String,
        required: [true, 'Please enter branch']
    },
    institutionName: {
        type: String,
        required: [true, 'Please enter institution name']
    },
    address: {
        type: String,
        required: [true, 'Please enter address']
    },
    logo: {
        type: String,
        default: ""
    },
    session: {
        type: String,
        required: [true, 'Please enter session']
    }
});

// Allow multiple configs per institution, but each config name must be unique within that institution
challanconfigschema.index({ colid: 1, configName: 1 }, { unique: true });

const ChallanConfig = mongoose.model('ChallanConfig', challanconfigschema);
module.exports = ChallanConfig;
