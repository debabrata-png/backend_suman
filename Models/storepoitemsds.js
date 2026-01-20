const mongoose = require('mongoose');

const storepoitemsdsschema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please enter name']
    },
    user: {
        type: String,
        required: [true, 'Please enter user'],
        unique: false
    },
    colid: {
        type: Number,
        required: [true, 'Please enter colid']
    },
    year: {
        type: String
    },
    poid: {
        type: String
    },
    vendor: {
        type: String
    },
    vendorid: {
        type: String
    },
    quantity: {
        type: Number
    },
    price: {
        type: Number
    },
    description: {
        type: String
    },
    reqdate: {
        type: Date
    },
    postatus: {
        type: String
    },
    itemid: {
        type: String
    },
    itemname: {
        type: String
    },
    itemtype: {
        type: String
    },
    status1: {
        type: String
    },
    comments: {
        type: String
    }
})
//
const storepoitemsds = mongoose.model('storepoitemsds', storepoitemsdsschema);

module.exports = storepoitemsds;

