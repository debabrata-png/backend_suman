const mongoose = require("mongoose");

const feefinedsSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    user: {
        type: String,
        required: true
    },
    colid: {
        type: Number,
        required: true
    },
    feeitem: {
        type: String
    },
    feegroup: {
        type: String
    },
    feecategory: {
        type: String
    },
    fromdate: {
        type: String,
    },
    todate: {
        type: String,
    },
    fineamount: {
        type: Number
    },
    finestatus: {
        type: String
    }
});

const feefineds = mongoose.model("feefineds", feefinedsSchema);

module.exports = feefineds;
