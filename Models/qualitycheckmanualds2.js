const mongoose = require('mongoose');

const qualitycheckmanualds2schema = new mongoose.Schema({
    srno: { type: Number },
    deliveredToStore: { type: String },
    vendorName: { type: String },
    material: { type: String },
    invoiceNo: { type: String },
    chalanNo: { type: String },
    modeOfSupply: { type: String },
    supplyRemark: { type: String },
    dateOfQualityCheck: { type: Date },
    initiatedBy: { type: String },
    remark: { type: String },
    documentLink: { type: String },
    name: { type: String, required: true },
    user: { type: String, required: true },
    colid: { type: Number, required: true }
});

const qualitycheckmanualds2 = mongoose.model('qualitycheckmanualds2', qualitycheckmanualds2schema);

module.exports = qualitycheckmanualds2;
