const budgetgroupds = require('../Models/budgetgroupds');
const { recordLog } = require('./budgetauditutils');

exports.addbudgetgroupds = async (req, res) => {
    try {
        const { username, useremail, ...bodyData } = req.body;
        const newItem = await budgetgroupds.create(bodyData);
        
        await recordLog({
            username, useremail, colid: newItem.colid,
            action: 'ADD_GROUP_CONFIG', module: 'BUDGET_CONFIG', recordid: newItem._id,
            details: { groupname: newItem.groupname, category: newItem.category }
        });

        res.status(201).json({ status: 'success', data: { item: newItem } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err });
    }
};

exports.getallbudgetgroupds = async (req, res) => {
    try {
        const { colid } = req.query;
        const items = await budgetgroupds.find({ colid });
        res.status(200).json({ status: 'success', results: items.length, data: { items } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err });
    }
};

exports.updatebudgetgroupds = async (req, res) => {
    try {
        const { id } = req.query;
        const { username, useremail, ...updateData } = req.body;
        const item = await budgetgroupds.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
        
        if (item) {
            await recordLog({
                username, useremail, colid: item.colid,
                action: 'UPDATE_GROUP_CONFIG', module: 'BUDGET_CONFIG', recordid: item._id,
                details: { changedFields: Object.keys(updateData) }
            });
        }

        res.status(200).json({ status: 'success', data: { item } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err });
    }
};

exports.deletebudgetgroupds = async (req, res) => {
    try {
        const { id, username, useremail } = req.query;
        const item = await budgetgroupds.findById(id);
        if (item) {
            await recordLog({
                username, useremail, colid: item.colid,
                action: 'DELETE_GROUP_CONFIG', module: 'BUDGET_CONFIG', recordid: item._id,
                details: { groupname: item.groupname, category: item.category }
            });
            await budgetgroupds.findByIdAndDelete(id);
        }
        res.status(204).json({ status: 'success', data: null });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err });
    }
};

exports.getbudgetgroupsdistinct = async (req, res) => {
    try {
        const { colid } = req.query;
        const groups = await budgetgroupds.distinct('groupname', { colid: Number(colid) });
        res.status(200).json({ status: 'success', data: { items: groups } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err });
    }
};

exports.getbudgetcategoriesbygroup = async (req, res) => {
    try {
        const { colid, groupname } = req.query;
        const items = await budgetgroupds.find({ colid: Number(colid), groupname });
        const categories = items.map(item => item.category);
        res.status(200).json({ status: 'success', data: { items: categories } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err });
    }
};
