const budgetpods = require('../Models/budgetpods');
const budgetpocatds = require('../Models/budgetpocatds');
const budgetapproverds = require('../Models/budgetapproverds');
const { recordLog } = require('./budgetauditutils');

// Helper: recalculate budget amount from its categories
async function recalcBudgetAmount(budgetId) {
    const cats = await budgetpocatds.find({ budgetid: budgetId });
    const total = cats.reduce((sum, c) => sum + (c.amount || 0), 0);
    await budgetpods.findByIdAndUpdate(budgetId, { amount: total });
    return total;
}

exports.addbudgetpods = async (req, res) => {
    try {
        const { username, useremail, ...bodyData } = req.body;
        const data = { ...bodyData, amount: 0, status: 'Draft' };
        const newItem = await budgetpods.create(data);
        
        await recordLog({
            username, useremail, colid: newItem.colid,
            action: 'CREATE', module: 'BUDGET', recordid: newItem._id, budgetid: newItem._id,
            details: { budgetname: newItem.budgetname, year: newItem.year, department: newItem.department }
        });

        res.status(201).json({ status: 'success', data: { item: newItem } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err });
    }
};

exports.updatebudgetpods = async (req, res) => {
    try {
        const { username, useremail, amount, ...updateData } = req.body;
        const item = await budgetpods.findByIdAndUpdate(req.query.id, updateData, { new: true, runValidators: true });
        
        if (item) {
            await recordLog({
                username, useremail, colid: item.colid,
                action: 'UPDATE', module: 'BUDGET', recordid: item._id, budgetid: item._id,
                details: { changedFields: Object.keys(updateData) }
            });
        }

        res.status(200).json({ status: 'success', data: { item } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err });
    }
};

exports.deletebudgetpods = async (req, res) => {
    try {
        const { username, useremail } = req.query; // Deletes often use query params for identity
        const item = await budgetpods.findById(req.query.id);
        if (item) {
            await recordLog({
                username, useremail, colid: item.colid,
                action: 'DELETE', module: 'BUDGET', recordid: item._id, budgetid: item._id,
                details: { budgetname: item.budgetname }
            });
            // Delete all budget categories belonging to this budget
            await budgetpocatds.deleteMany({ budgetid: req.query.id });
            await budgetpods.findByIdAndDelete(req.query.id);
        }
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

// Submit budget for approval — sets status to Pending and starts the progression at level 1
exports.submitbudgetforapproval = async (req, res) => {
    try {
        const { id, colid, username, useremail } = req.query;
        const budget = await budgetpods.findById(id);
        if (!budget) return res.status(404).json({ status: 'fail', message: 'Budget not found' });

        const cid = Number(colid);
        const dept = (budget.department || '').trim();

        // Safety check: Ensure at least one approver (Dept or Global) exists for this flow
        const hasApprovers = await budgetapproverds.findOne({
            colid: cid,
            $or: [
                { approvaltype: { $regex: /^global$/i } },
                { approvaltype: { $regex: /^department$/i }, department: dept },
                { approvaltype: { $exists: false } },
                { approvaltype: '' },
                { approvaltype: null }
            ]
        });

        if (!hasApprovers) {
            return res.status(400).json({ 
                status: 'fail', 
                message: `No approvers configured for colid ${cid} and department ${dept}. Please configure at least one level.` 
            });
        }

        budget.status = 'Pending';
        budget.currentlevel = 1;
        budget.approvedby = []; // Start with fresh history
        await budget.save();

        await recordLog({
            username, useremail, colid: cid,
            action: 'SUBMIT', module: 'BUDGET', recordid: budget._id, budgetid: budget._id,
            details: { status: 'Pending', currentlevel: 1 }
        });

        res.status(200).json({ status: 'success', data: { item: budget } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err });
    }
};


// Get budgets that the current user needs to approve (Dynamic approach)
exports.getbudgetsforapproval = async (req, res) => {
    try {
        const { colid, useremail } = req.query;
        if (!useremail) return res.status(400).json({ status: 'fail', message: 'useremail is required' });

        const cid = Number(colid);
        
        // 1. Fetch all approver configurations for this user
        const myConfigs = await budgetapproverds.find({ 
            colid: cid, 
            approveremail: { $regex: new RegExp(`^${useremail}$`, 'i') } 
        });

        if (myConfigs.length === 0) {
            return res.status(200).json({ status: 'success', data: { items: [] } });
        }

        // 2. Build conditions based on my config levels
        const conditions = myConfigs.map(conf => {
            const level = Number(conf.levelofapproval);
            const type = (conf.approvaltype || 'Global').toLowerCase();
            
            const cond = { 
                colid: cid, 
                status: 'Pending', 
                currentlevel: level 
            };

            if (type === 'department' && conf.department) {
                cond.department = conf.department;
            }
            return cond;
        });

        // 3. Find budgets matching ANY of my configurations
        const budgets = await budgetpods.find({ $or: conditions });

        // Build response items and attach matching config and categories
        const items = await Promise.all(budgets.map(async b => {
            const budgetObj = b.toObject();
            
            // Fetch categories for this budget to show in the approval screen
            const cats = await budgetpocatds.find({ budgetid: b._id });
            budgetObj.categories = cats;
            budgetObj.amount = cats.reduce((sum, c) => sum + (c.amount || 0), 0);

            const matchingConfig = myConfigs.find(c => {
                const level = Number(c.levelofapproval);
                const type = (c.approvaltype || 'Global').toLowerCase();
                if (level !== b.currentlevel) return false;
                if (type === 'department' && c.department !== b.department) return false;
                return true;
            });
            budgetObj.approverConfig = matchingConfig ? matchingConfig.toObject() : {};
            return budgetObj;
        }));

        res.status(200).json({ status: 'success', data: { items } });
    } catch (err) {
        console.error('Error in getbudgetsforapproval:', err);
        res.status(400).json({ status: 'fail', message: err.message });
    }
};


// Approve or reject a budget (Dynamic approach: adds to history and moves level)
exports.approvebudgetpods = async (req, res) => {
    try {
        const { id } = req.query;
        const { status, remarks, approvername, approveremail } = req.body; 

        const budget = await budgetpods.findById(id);
        if (!budget) return res.status(404).json({ status: 'fail', message: 'Budget not found' });

        // Add to approval history
        budget.approvedby.push({
            approvername: approvername || 'Unknown',
            approveremail: approveremail || '',
            levelofapproval: budget.currentlevel,
            status: status,
            date: new Date()
        });

        const oldLevel = budget.currentlevel;
        const oldStatus = budget.status;

        if (status === 'Rejected') {
            budget.status = 'Rejected';
            budget.remarks = remarks || '';
        } else {
            // Check if there are any approvers for the NEXT level
            const nextLevel = budget.currentlevel + 1;
            const hasNextApprovers = await budgetapproverds.findOne({
                colid: budget.colid,
                $or: [
                    { levelofapproval: nextLevel, approvaltype: { $regex: /^global$/i } },
                    { levelofapproval: nextLevel, approvaltype: { $regex: /^department$/i }, department: budget.department }
                ]
            });

            if (hasNextApprovers) {
                budget.currentlevel = nextLevel;
            } else {
                budget.status = 'Approved';
            }
        }

        await budget.save();

        await recordLog({
            username: approvername, useremail: approveremail, colid: budget.colid,
            action: status === 'Approved' ? 'APPROVE' : 'REJECT', 
            module: 'BUDGET', recordid: budget._id, budgetid: budget._id,
            details: { 
                level: oldLevel, 
                remarks, 
                fromStatus: oldStatus, 
                toStatus: budget.status,
                nextLevel: budget.currentlevel 
            }
        });

        res.status(200).json({ status: 'success', data: { item: budget } });
    } catch (err) {
        console.error('Error in approvebudgetpods:', err);
        res.status(400).json({ status: 'fail', message: err.message });
    }
};
