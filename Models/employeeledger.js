const mongoose = require('mongoose');

const employeeLedgerSchema = new mongoose.Schema({
    empemail: { type: String, required: true },
    name: { type: String },
    colid: { type: Number },
    month: { type: Number },
    year: { type: Number },
    amount: { type: Number, required: true }, // Positive for payables (company owes), negative for receivables (employee owes)? 
    // Actually, let's stick to transactionType to define direction.
    transactionType: { 
        type: String, 
        enum: ['Salary', 'Bonus', 'Fine', 'Adjustment', 'Advance', 'Settlement', 'Deduction'],
        required: true 
    },
    direction: {
        type: String,
        enum: ['Credit', 'Debit'], // Credit: Company pays employee, Debit: Employee pays/owes company
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Paid'],
        default: 'Pending'
    },
    description: { type: String },
    date: { type: Date, default: Date.now },
    addedBy: { type: String } 
}, { timestamps: true });

module.exports = mongoose.model('EmployeeLedger', employeeLedgerSchema);
