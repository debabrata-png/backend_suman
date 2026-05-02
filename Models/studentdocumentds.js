const mongoose = require('mongoose');

const studentDocumentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
    colid: { type: Number, required: true },
    username: { type: String, required: true },
    regno: { type: String, required: true },
    documentname: { type: String, required: true },
    doclink: { type: String, required: true },
    remarks: { type: String }
}, { timestamps: true });

studentDocumentSchema.index({ colid: 1, regno: 1 });
studentDocumentSchema.index({ colid: 1, username: 1 });

const StudentDocument = mongoose.model('StudentDocument', studentDocumentSchema);

module.exports = StudentDocument;
