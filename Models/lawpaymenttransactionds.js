const mongoose = require("mongoose");

const lawpaymenttransactiondsSchema = new mongoose.Schema({
    paymentid: { type: mongoose.Schema.Types.ObjectId, ref: 'lawpaymentds', required: true },
    colid: { type: Number, required: true },
    transactiondate: { type: Date, default: Date.now },
    amount: { type: Number, required: true },
    paymentmode: { type: String, required: true }, // Cash, Cheque, UPI, Bank Transfer
    transactionref: { type: String },
    notes: { type: String },
    createdby: { type: String, required: true }
});

const lawpaymenttransactionds = mongoose.model("lawpaymenttransactionds", lawpaymenttransactiondsSchema);

module.exports = lawpaymenttransactionds;
