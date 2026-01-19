const mongoose = require('mongoose');

const storepoorderdsschema = new mongoose.Schema({
    name: { type: String, required: true },
    user: { type: String, required: true },
    colid: { type: Number, required: true },

    year: { type: String },
    vendor: { type: String },
    vendorid: { type: String },
    poid: { type: String },
    price: { type: Number },
    description: { type: String },
    returnamount: { type: Number },
    netprice: { type: Number },
    updatedate: { type: Date },
    postatus: { type: String },
    level: { type: Number, default: 0 },
    level1_status: { type: String, default: 'Pending' },
    level2_status: { type: String, default: 'Pending' }
});

const storepoorderds = mongoose.model('storepoorderds', storepoorderdsschema);
module.exports = storepoorderds;