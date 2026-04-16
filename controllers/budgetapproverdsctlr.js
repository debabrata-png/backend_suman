const budgetapproverds = require('../Models/budgetapproverds');
const { recordLog } = require('./budgetauditutils');

exports.addbudgetapproverds = async (req, res) => {
    try {
        const { username, useremail, ...bodyData } = req.body;
        const newItem = await budgetapproverds.create(bodyData);
        
        await recordLog({
            username, useremail, colid: newItem.colid,
            action: 'ADD_APPROVER', module: 'BUDGET_CONFIG', recordid: newItem._id,
            details: { approveremail: newItem.approveremail, level: newItem.levelofapproval }
        });

        res.status(201).json({ status: 'success', data: { item: newItem } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err });
    }
};

exports.updatebudgetapproverds = async (req, res) => {
    try {
        const { username, useremail, ...updateData } = req.body;
        const item = await budgetapproverds.findByIdAndUpdate(req.query.id, updateData, { new: true, runValidators: true });
        
        if (item) {
            await recordLog({
                username, useremail, colid: item.colid,
                action: 'UPDATE_APPROVER', module: 'BUDGET_CONFIG', recordid: item._id,
                details: { changedFields: Object.keys(updateData) }
            });
        }

        res.status(200).json({ status: 'success', data: { item } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err });
    }
};

exports.deletebudgetapproverds = async (req, res) => {
    try {
        const { username, useremail } = req.query;
        const item = await budgetapproverds.findById(req.query.id);
        if (item) {
            await recordLog({
                username, useremail, colid: item.colid,
                action: 'DELETE_APPROVER', module: 'BUDGET_CONFIG', recordid: item._id,
                details: { approveremail: item.approveremail }
            });
            await budgetapproverds.findByIdAndDelete(req.query.id);
        }
        res.status(204).json({ status: 'success', data: null });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err });
    }
};

exports.getallbudgetapproverds = async (req, res) => {
    try {
        const { colid } = req.query;
        const items = await budgetapproverds.find({ colid });
        res.status(200).json({ status: 'success', results: items.length, count: items.length, data: { items } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err });
    }
};

exports.getbudgetapproverdsbyid = async (req, res) => {
    try {
        const item = await budgetapproverds.findById(req.query.id);
        res.status(200).json({ status: 'success', data: { item } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err });
    }
};
