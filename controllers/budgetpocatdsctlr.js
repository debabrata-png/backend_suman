const Institution = require('../Models/institutions');
const budgetpocatds = require('../Models/budgetpocatds');
const budgetpods = require('../Models/budgetpods');
const { recordLog } = require('./budgetauditutils');

// Helper: recalculate parent budget amount
async function recalcBudgetAmount(budgetId) {
    const cats = await budgetpocatds.find({ budgetid: budgetId });
    const total = cats.reduce((sum, c) => sum + (c.amount || 0), 0);
    await budgetpods.findByIdAndUpdate(budgetId, { amount: total });
    return total;
}

// Helper: Get list of colids under an admincolid
async function getColidList(colid, isAdmin = false) {
    if (!isAdmin) return [Number(colid)];
    const institutions = await Institution.find({ admincolid: Number(colid) });
    return institutions.map(i => i.colid);
}

exports.addbudgetpocatds = async (req, res) => {
    try {
        const { username, useremail, ...bodyData } = req.body;
        const newItem = await budgetpocatds.create(bodyData);
        // Recalculate parent budget amount
        if (newItem.budgetid) await recalcBudgetAmount(newItem.budgetid);

        await recordLog({
            username, useremail, colid: newItem.colid,
            action: 'ADD_CATEGORY', module: 'BUDGET_CATEGORY', recordid: newItem._id, budgetid: newItem.budgetid,
            details: { category: newItem.category, amount: newItem.amount, budgetname: newItem.budgetname }
        });

        res.status(201).json({ status: 'success', data: { item: newItem } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err });
    }
};

exports.updatebudgetpocatds = async (req, res) => {
    try {
        const { username, useremail, ...updateData } = req.body;
        const item = await budgetpocatds.findByIdAndUpdate(req.query.id, updateData, { new: true, runValidators: true });
        // Recalculate parent budget amount
        if (item && item.budgetid) {
            await recalcBudgetAmount(item.budgetid);
            await recordLog({
                username, useremail, colid: item.colid,
                action: 'UPDATE_CATEGORY', module: 'BUDGET_CATEGORY', recordid: item._id, budgetid: item.budgetid,
                details: { changedFields: Object.keys(updateData) }
            });
        }
        res.status(200).json({ status: 'success', data: { item } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err });
    }
};

exports.deletebudgetpocatds = async (req, res) => {
    try {
        const { username, useremail } = req.query;
        const item = await budgetpocatds.findById(req.query.id);
        if (item) {
            const budgetId = item.budgetid;
            await recordLog({
                username, useremail, colid: item.colid,
                action: 'DELETE_CATEGORY', module: 'BUDGET_CATEGORY', recordid: item._id, budgetid: item.budgetid,
                details: { category: item.category, amount: item.amount }
            });
            await budgetpocatds.findByIdAndDelete(req.query.id);
            // Recalculate parent budget amount
            if (budgetId) await recalcBudgetAmount(budgetId);
        }
        res.status(204).json({ status: 'success', data: null });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err });
    }
};

exports.getallbudgetpocatds = async (req, res) => {
    try {
        const { colid, ismanagement } = req.query;
        const colidList = await getColidList(colid, ismanagement === 'true');
        const items = await budgetpocatds.find({ colid: { $in: colidList } });
        res.status(200).json({ status: 'success', results: items.length, count: items.length, data: { items } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err });
    }
};

exports.getbudgetpocatdsbybudgetid = async (req, res) => {
    try {
        const { budgetid, colid } = req.query;
        const items = await budgetpocatds.find({ budgetid, colid });
        res.status(200).json({ status: 'success', results: items.length, count: items.length, data: { items } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err });
    }
};

// Update only amount — used by approvers with edit access
exports.updatebudgetpocatdsamount = async (req, res) => {
    try {
        const { id } = req.query;
        const { amount, username, useremail } = req.body;
        const oldItem = await budgetpocatds.findById(id);
        
        const item = await budgetpocatds.findByIdAndUpdate(id, { amount }, { new: true });
        if (item && item.budgetid) {
            await recalcBudgetAmount(item.budgetid);
            await recordLog({
                username, useremail, colid: item.colid,
                action: 'APPROVER_EDIT_AMOUNT', module: 'BUDGET_CATEGORY', recordid: item._id, budgetid: item.budgetid,
                details: { 
                    category: item.category, 
                    oldAmount: oldItem ? oldItem.amount : 0, 
                    newAmount: amount 
                }
            });
        }
        res.status(200).json({ status: 'success', data: { item } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err });
    }
};

exports.getavailbudgetbycategoryds = async (req, res) => {
    try {
        const { colid, category, year, department, ismanagement } = req.query;
        const colidList = await getColidList(colid, ismanagement === 'true');
        let query = { colid: { $in: colidList } };
        if (category) query.category = category;
        if (year) query.year = year;
        if (department) query.department = department;

        const items = await budgetpocatds.find(query);

        // Return detailed summary for the dashboard
        const summary = items.map(item => ({
            category: item.category,
            department: item.department || 'General',
            availableAmount: item.amount || 0
        }));

        res.status(200).json({
            success: true,
            status: 'success',
            budgetInfo: summary, // Frontend expects budgetInfo
            data: { availableAmount: items.reduce((sum, c) => sum + (c.amount || 0), 0) }
        });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err });
    }
};

exports.getgroupwisecategorybudget = async (req, res) => {
    try {
        const { colid, year, ismanagement, searchcolid } = req.query;
        const colidList = searchcolid ? [Number(searchcolid)] : await getColidList(colid, ismanagement === 'true');
        let query = { colid: { $in: colidList } };
        if (year) query.year = year;

        const results = await budgetpocatds.aggregate([
            { $match: query },
            {
                $group: {
                    _id: { groupname: "$groupname", category: "$category" },
                    totalAmount: { $sum: "$amount" }
                }
            },
            {
                $group: {
                    _id: "$_id.groupname",
                    categories: {
                        $push: {
                            category: "$_id.category",
                            amount: "$totalAmount"
                        }
                    },
                    groupTotal: { $sum: "$totalAmount" }
                }
            },
            {
                $project: {
                    groupname: "$_id",
                    categories: 1,
                    groupTotal: 1,
                    _id: 0
                }
            }
        ]);

        res.status(200).json({ status: 'success', results: results.length, data: { items: results } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err });
    }
};

exports.getcategorywisebudget = async (req, res) => {
    try {
        const { colid, year, ismanagement, searchcolid } = req.query;
        const colidList = searchcolid ? [Number(searchcolid)] : await getColidList(colid, ismanagement === 'true');
        let query = { colid: { $in: colidList } };
        if (year) query.year = year;

        const results = await budgetpocatds.aggregate([
            { $match: query },
            {
                $group: {
                    _id: { category: "$category", groupname: "$groupname" },
                    totalAmount: { $sum: "$amount" }
                }
            },
            {
                $group: {
                    _id: "$_id.category",
                    groups: {
                        $push: {
                            groupname: "$_id.groupname",
                            amount: "$totalAmount"
                        }
                    },
                    categoryTotal: { $sum: "$totalAmount" }
                }
            },
            {
                $sort: { categoryTotal: -1 }
            },
            {
                $project: {
                    category: "$_id",
                    groups: 1,
                    categoryTotal: 1,
                    _id: 0
                }
            }
        ]);

        res.status(200).json({ status: 'success', results: results.length, data: { items: results } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err });
    }
};

exports.getdepartmentwisebudget = async (req, res) => {
    try {
        const { colid, year, ismanagement, searchcolid } = req.query;
        const colidList = searchcolid ? [Number(searchcolid)] : await getColidList(colid, ismanagement === 'true');
        let query = { colid: { $in: colidList } };
        if (year) query.year = year;

        // Note: Grouping budgetpods by department for "Main Budget Report"
        const results = await budgetpods.aggregate([
            { $match: query },
            {
                $group: {
                    _id: "$department",
                    budgets: {
                        $push: {
                            budgetname: "$budgetname",
                            amount: "$amount",
                            status: "$status",
                            budgettype: "$budgettype"
                        }
                    },
                    departmentTotal: { $sum: "$amount" }
                }
            },
            {
                $sort: { departmentTotal: -1 }
            },
            {
                $project: {
                    department: "$_id",
                    budgets: 1,
                    departmentTotal: 1,
                    _id: 0
                }
            }
        ]);

        res.status(200).json({ status: 'success', results: results.length, data: { items: results } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err });
    }
};

exports.getdistinctbudgetcategories = async (req, res) => {
    try {
        const { colid, ismanagement } = req.query;
        const colidList = await getColidList(colid, ismanagement === 'true');
        const items = await budgetpocatds.distinct('category', { colid: { $in: colidList } });
        res.status(200).json({ status: 'success', data: { items } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err });
    }
};

exports.getdistinctbudgetgroups = async (req, res) => {
    try {
        const { colid, ismanagement } = req.query;
        const colidList = await getColidList(colid, ismanagement === 'true');
        const items = await budgetpocatds.distinct('groupname', { colid: { $in: colidList } });
        res.status(200).json({ status: 'success', data: { items } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err });
    }
};


exports.getinstitutioncategorybudget = async (req, res) => {
    try {
        const { colid, category, year } = req.query;
        let query = { colid: Number(colid), category };
        if (year) query.year = year;

        const results = await budgetpocatds.aggregate([
            { $match: query },
            {
                $group: {
                    _id: "$institution",
                    totalAmount: { $sum: "$amount" }
                }
            },
            {
                $project: {
                    institution: { $ifNull: ["$_id", "Unspecified Institution"] },
                    amount: "$totalAmount",
                    _id: 0
                }
            },
            { $sort: { amount: -1 } }
        ]);

        res.status(200).json({ status: 'success', results: results.length, data: { items: results } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err });
    }
};

exports.getinstitutiongroupcategorybudget = async (req, res) => {
    try {
        const { colid, groupname, category, year, ismanagement, searchcolid } = req.query;
        const colidList = searchcolid ? [Number(searchcolid)] : await getColidList(colid, ismanagement === 'true');
        let query = { colid: { $in: colidList }, groupname, category };
        if (year) query.year = year;

        const results = await budgetpocatds.aggregate([
            { $match: query },
            {
                $group: {
                    _id: "$institution",
                    totalAmount: { $sum: "$amount" }
                }
            },
            {
                $project: {
                    institution: { $ifNull: ["$_id", "Unspecified Institution"] },
                    amount: "$totalAmount",
                    _id: 0
                }
            },
            { $sort: { amount: -1 } }
        ]);

        res.status(200).json({ status: 'success', results: results.length, data: { items: results } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err });
    }
};

exports.getinstitutionsforbudget = async (req, res) => {
    try {
        const { colid } = req.query;
        const institutions = await Institution.find({ admincolid: Number(colid) });
        res.status(200).json({ status: 'success', data: { items: institutions } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err });
    }
};

