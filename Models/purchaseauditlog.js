const mongoose = require('mongoose');

const purchaseAuditLogSchema = new mongoose.Schema({
    username: { type: String, required: true },
    useremail: { type: String, required: true },
    action: { type: String, required: true }, // e.g., 'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT'
    module: { type: String, required: true }, // e.g., 'MRN_CONFIG', 'REQUISITION'
    recordid: { type: String },
    colid: { type: String, required: true },
    details: { type: mongoose.Schema.Types.Mixed }, // JSON for previous/new state or comments
    timestamp: { type: Date, default: Date.now }
});

const purchaseauditlog = mongoose.model('purchaseauditlog', purchaseAuditLogSchema);

module.exports = purchaseauditlog;
