const EmployeeLedger = require('../Models/employeeledger');
const User = require('../Models/user');

// Fetch settlement data - Aggregates all ledger entries for an employee
exports.getSettlementData = async (req, res) => {
    try {
        const { email, colid } = req.query;
        if (!email) return res.status(400).json({ message: "Email is required" });

        const ledgerEntries = await EmployeeLedger.find({ 
            empemail: email, 
            colid: Number(colid) 
        }).sort({ date: 1 });

        const totalPayable = ledgerEntries
            .filter(e => e.direction === 'Credit')
            .reduce((sum, e) => sum + e.amount, 0);

        const totalReceivable = ledgerEntries
            .filter(e => e.direction === 'Debit')
            .reduce((sum, e) => sum + e.amount, 0);

        const netBalance = totalPayable - totalReceivable;

        res.status(200).json({
            success: true,
            email,
            ledgerEntries,
            summary: {
                totalPayable,
                totalReceivable,
                netBalance,
                direction: netBalance >= 0 ? 'Company owes Employee' : 'Employee owes Company'
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Process Final Settlement - Records the final transaction and updates user status
exports.processFinalSettlement = async (req, res) => {
    try {
        const { email, colid, amount, settlementFormat, description, addedBy } = req.body;

        const user = await User.findOne({ email, colid });
        if (!user) return res.status(404).json({ message: "User not found" });

        // Record the settlement transaction in the ledger
        const finalLedgerEntry = await EmployeeLedger.create({
            empemail: email,
            name: user.name,
            colid: Number(colid),
            amount: Math.abs(amount),
            transactionType: 'Settlement',
            direction: amount >= 0 ? 'Credit' : 'Debit',
            paymentStatus: 'Paid',
            description: `Final Settlement (${settlementFormat}): ${description}`,
            addedBy
        });

        // Update User Status (e.g., status 4 for exited/settled)
        user.status = 4; // Assuming 4 is "Settled/Exited"
        await user.save();

        res.status(200).json({
            success: true,
            message: "Final settlement processed successfully.",
            finalLedgerEntry
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Add manual entry to ledger
exports.addLedgerEntry = async (req, res) => {
    try {
        const { email, colid, amount, transactionType, direction, description, addedBy } = req.body;
        
        const user = await User.findOne({ email, colid });
        
        const entry = await EmployeeLedger.create({
            empemail: email,
            name: user ? user.name : "Unknown",
            colid: Number(colid),
            amount,
            transactionType,
            direction,
            description,
            addedBy,
            paymentStatus: 'Paid'
        });

        res.status(201).json({ success: true, entry });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
