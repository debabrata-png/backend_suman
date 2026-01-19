const mongoose = require('mongoose');

const storepoitemschema = new mongoose.Schema({
    name: { type: String, required: true },
    user: { type: String, required: true },
    colid: { type: Number, required: true },

    year: { type: String },
    poid: { type: String },
    vendor: { type: String },
    vendorid: { type: String },
    quantity: { type: Number },
    price: { type: Number },
    description: { type: String }, // Corrected spelling from 'desription' to 'description'
    reqdate: { type: Date },
    postatus: { type: String },
    itemid: { type: String },
    itemname: { type: String },
    itemtype: { type: String }
});

const storepoitemsds = mongoose.model('storepoitemsds', storepoitemschema);
module.exports = storepoitemsds;