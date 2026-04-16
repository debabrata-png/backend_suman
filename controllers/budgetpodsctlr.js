const budgetpods = require('../Models/budgetpods');
const budgetpocatds = require('../Models/budgetpocatds');
const budgetapproverds = require('../Models/budgetapproverds');

// Helper: recalculate budget amount from its categories
async function recalcBudgetAmount(budgetId) {
    const cats = await budgetpocatds.find({ budgetid: budgetId });
    const total = cats.reduce((sum, c) => sum + (c.amount || 0), 0);
    await budgetpods.findByIdAndUpdate(budgetId, { amount: total });
    return total;
}

exports.addbudgetpods = async (req, res) => {
    try {
        const data = { ...req.body, amount: 0, status: 'Draft' };
        const newItem = await budgetpods.create(data);
        res.status(201).json({ status: 'success', data: { item: newItem } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err });
    }
};

exports.updatebudgetpods = async (req, res) => {
    try {
        // Do not allow amount update from here — amount is always auto-calculated
        const { amount, ...updateData } = req.body;
        const item = await budgetpods.findByIdAndUpdate(req.query.id, updateData, { new: true, runValidators: true });
        res.status(200).json({ status: 'success', data: { item } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err });
    }
};

exports.deletebudgetpods = async (req, res) => {
    try {
        // Delete all budget categories belonging to this budget
        await budgetpocatds.deleteMany({ budgetid: req.query.id });
        await budgetpods.findByIdAndDelete(req.query.id);
        res.status(204).json({ status: 'success', data: null });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err });
    }
};

exports.getallbudgetpods = async (req, res) => {
    try {
        const { colid } = req.query;
        const items = await budgetpods.find({ colid });
        // For each budget, recalculate the amount from categories
        const result = [];
        for (const budget of items) {
            const cats = await budgetpocatds.find({ budgetid: budget._id });
            const total = cats.reduce((sum, c) => sum + (c.amount || 0), 0);
            const b = budget.toObject();
            b.amount = total;
            b.categoryCount = cats.length;
            result.push(b);
        }
        res.status(200).json({ status: 'success', results: result.length, count: result.length, data: { items: result } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err });
    }
};

exports.getbudgetpodsbyid = async (req, res) => {
    try {
        const item = await budgetpods.findById(req.query.id);
        res.status(200).json({ status: 'success', data: { item } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err });
    }
};

// Submit budget for approval — sets status to Pending and populates approvedby from configured approvers
exports.submitbudgetforapproval = async (req, res) => {
    try {
        const { id, colid } = req.query;
        const budget = await budgetpods.findById(id);
        if (!budget) return res.status(404).json({ status: 'fail', message: 'Budget not found' });

        const dept = budget.department;

        // Fetch department-specific approvers and global approvers
        const deptApprovers = await budgetapproverds.find({ colid, approvaltype: 'Department', department: dept }).sort({ levelofapproval: 1 });
        const globalApprovers = await budgetapproverds.find({ colid, approvaltype: 'Global' }).sort({ levelofapproval: 1 });

        // Merge logic: Department approvers first, then Global approvers
        // We need to re-assign levels or ensure they don't overlap if they are meant to be sequential
        // For simplicity, we'll just chain them as they are configured. 
        // A better way is to treat them as independent levels.
        const combinedApprovers = [...deptApprovers, ...globalApprovers];

        if (combinedApprovers.length === 0) return res.status(400).json({ status: 'fail', message: 'No approvers configured' });

        const approvedby = combinedApprovers.map((a, index) => ({
            approvername: a.approvername,
            approveremail: a.approveremail,
            levelofapproval: index + 1, // Sequential level
            status: 'Pending',
            date: null
        }));

        // Final level is the last one in the combined list
        const finallevel = approvedby.length;

        budget.approvedby = approvedby;
        budget.finallevel = finallevel;
        budget.status = 'Pending';
        await budget.save();

        res.status(200).json({ status: 'success', data: { item: budget } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err });
    }
};


// Get budgets that the current user needs to approve
exports.getbudgetsforapproval = async (req, res) => {
    try {
        const { colid, useremail } = req.query;
        if (!useremail) return res.status(400).json({ status: 'fail', message: 'useremail is required' });

        // Get all pending budgets for this colid
        const pendingBudgets = await budgetpods.find({ colid, status: 'Pending' });

        // Filter: budgets where this user is one of the approvers and it's their turn
        const filtered = [];
        for (const b of pendingBudgets) {
            // Find user's entry in approvedby
            const myEntry = b.approvedby.find(a => a.approveremail === useremail && a.status === 'Pending');
            if (!myEntry) continue;

            // My level
            const myLevel = myEntry.levelofapproval;

            // Check if all previous levels are Approved
            const lowerLevels = b.approvedby.filter(a => a.levelofapproval < myLevel);
            if (lowerLevels.every(a => a.status === 'Approved')) {
                // Attach approver config for editing permissions
                const conf = await budgetapproverds.findOne({ colid, approveremail: useremail });
                const budgetObj = b.toObject();
                budgetObj.approverConfig = conf ? conf.toObject() : {};
                filtered.push(budgetObj);
            }
        }

        // Attach category info
        const result = [];
        for (const budget of filtered) {
            const cats = await budgetpocatds.find({ budgetid: budget._id });
            const total = cats.reduce((sum, c) => sum + (c.amount || 0), 0);
            budget.amount = total;
            budget.categories = cats;
            result.push(budget);
        }

        res.status(200).json({ status: 'success', results: result.length, count: result.length, data: { items: result } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err });
    }
};


// Approve or reject a budget at a specific level
exports.approvebudgetpods = async (req, res) => {
    try {
        const { id } = req.query;
        const { levelofapproval, status, remarks } = req.body; // status = 'Approved' or 'Rejected'

        const budget = await budgetpods.findById(id);
        if (!budget) return res.status(404).json({ status: 'fail', message: 'Budget not found' });

        const entriesAtLevel = budget.approvedby.filter(a => a.levelofapproval === levelofapproval);
        if (entriesAtLevel.length === 0) return res.status(400).json({ status: 'fail', message: 'Approval level not found' });

        entriesAtLevel.forEach(entry => {
            entry.status = status;
            entry.date = new Date();
        });

        if (status === 'Rejected') {
            budget.status = 'Rejected';
            budget.remarks = remarks || '';
        } else if (status === 'Approved') {
            // Check if this is the final level
            if (levelofapproval === budget.finallevel) {
                budget.status = 'Approved';
            }
            // Otherwise budget stays Pending for next level
        }

        await budget.save();
        res.status(200).json({ status: 'success', data: { item: budget } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err });
    }
};
