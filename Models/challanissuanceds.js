const mongoose = require('mongoose');

const challanissuancedsschema = new mongoose.Schema({
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
    academicyear: {
        type: String
    },
    programcode: {
        type: String
    },
    regno: {
        type: String
    },
    feegroup: {
        type: String
    },
    feeitem: {
        type: String
    },
    semester: {
        type: String
    },
    feecategory: {
        type: String
    },
    actualAmount: {
        type: Number
    },
    paidAmount: {
        type: Number
    },
    balance: {
        type: Number
    },
    challanNo: {
        type: String,
        unique: true
    },
    challanDate: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        default: 'Issued'
    },
    comments: {
        type: String
    }
}, {
    timestamps: true
});

const challanissuanceds = mongoose.model('challanissuanceds', challanissuancedsschema);

module.exports = challanissuanceds;
