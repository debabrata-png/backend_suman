const storebudgetds2 = require("../Models/storebudgetds2");
const storecashaccountds2 = require("../Models/storecashaccountds2");
const storepoorderds2 = require("../Models/storepoorderds2");

// --- BUDGET APIs ---
exports.addStoreBudget2 = async (req, res) => {
    try {
        const { headName, headType, allocatedBudget, financialYear, allocatedBy, colid } = req.body;
        const newBudget = await storebudgetds2.create({
            headName, headType, allocatedBudget, availableBudget: allocatedBudget, financialYear, allocatedBy, colid
        });
        res.status(201).json({ success: true, data: newBudget });
    } catch (error) { res.status(500).json({ success: false, error: error.message }); }
};

exports.getStoreBudgets2 = async (req, res) => {
    try {
        const budgets = await storebudgetds2.find({ colid: req.query.colid });
        res.status(200).json({ success: true, data: budgets });
    } catch (error) { res.status(500).json({ success: false, error: error.message }); }
};

// --- CASH ACCOUNT APIs ---
exports.addCashAccountBalance2 = async (req, res) => {
    try {
        const { storeid, storeName, colid, balance, allocatedBy } = req.body;

        let account = await storecashaccountds2.findOne({ storeid, colid });
        if (account) {
            account.balance += Number(balance);
            account.transactions.push({
                amount: balance,
                type: 'CREDIT',
                remarks: `Refill by ${allocatedBy}`
            });
            await account.save();
        } else {
            account = await storecashaccountds2.create({
                storeid, storeName, colid, balance, allocatedBy,
                transactions: [{ amount: balance, type: 'CREDIT', remarks: 'Initial Allocation' }]
            });
        }
        res.status(200).json({ success: true, data: account });
    } catch (error) { res.status(500).json({ success: false, error: error.message }); }
};

exports.getStoreCashAccounts2 = async (req, res) => {
    try {
        const query = { colid: req.query.colid };
        if (req.query.storeid) query.storeid = req.query.storeid;
        const accounts = await storecashaccountds2.find(query);
        res.status(200).json({ success: true, data: accounts });
    } catch (error) { res.status(500).json({ success: false, error: error.message }); }
};

// --- DEDUCTION LOGIC ---
exports.deductCashForLocalPO2 = async (req, res) => {
    try {
        const { poid, colid, actualAmount } = req.body;

        // 1. Fetch the corresponding PO
        const poOrder = await storepoorderds2.findOne({ poid, colid });
        if (!poOrder) return res.status(404).json({ success: false, message: 'PO not found' });

        // Ensure its a local purchase
        if (poOrder.poType !== 'Local') {
            return res.status(400).json({ success: false, message: 'PO is not marked as Local Purchase' });
        }

        // 2. Fetch the Cash Account for the store
        const account = await storecashaccountds2.findOne({ storeid: poOrder.storeid, colid });
        if (!account) return res.status(404).json({ success: false, message: 'No Cash Account found for Store' });

        // 3. Prevent deduction if insufficient balance
        if (account.balance < actualAmount) {
            return res.status(400).json({ success: false, message: `Insufficient Store Cash Balance. Needed: ${actualAmount}, Found: ${account.balance}` });
        }

        // 4. Update the PO details and status
        poOrder.actualAmount = actualAmount;
        poOrder.postatus = 'Completed'; // For local purchases, it's instant delivery essentially
        await poOrder.save();

        // 5. Update the cash account
        account.balance -= actualAmount;
        account.transactions.push({
            amount: actualAmount,
            type: 'DEBIT',
            poid: poOrder.poid,
            remarks: `Deduction for Local Purchase Order ${poOrder.poid}`
        });
        await account.save();

        res.status(200).json({ success: true, message: "Local Purchase authorized and Cash Deducted successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error processing deduction", error: error.message });
    }
};
