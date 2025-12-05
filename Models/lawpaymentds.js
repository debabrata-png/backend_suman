const mongoose = require("mongoose");

const lawpaymentdsSchema = new mongoose.Schema({
    colid: { type: Number, required: true },
    caseno: { type: String, required: true },
    clientname: { type: String, required: true },
    totalamount: { type: Number, required: true },
    paidamount: { type: Number, default: 0 },
    balanceamount: { type: Number, required: true },
    paymentstatus: { type: String, enum: ['Pending', 'Partial', 'Paid'], default: 'Pending' },
    createdat: { type: Date, default: Date.now },
    createdby: { type: String, required: true }
});

const lawpaymentds = mongoose.model("lawpaymentds", lawpaymentdsSchema);

module.exports = lawpaymentds;
