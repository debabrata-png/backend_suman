const mongoose = require('mongoose');

const vendordsschema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    user: {
        type: String,
        required: true
    },
    colid: {
        type: Number,
        required: true
    },
    vendorname: {
        type: String,
        required: true
    },
    pan: {
        type: String,
        required: true
    },
    gst: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    state: {
        type: String,
        required: true
    },
    city: {
        type: String,
        required: true
    },

    mobileno: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
})

const vendords = mongoose.model('vendords', vendordsschema);
module.exports = vendords;