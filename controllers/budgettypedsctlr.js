const budgettypeds = require('../Models/budgettypeds');
const { recordLog } = require('./budgetauditutils');

exports.addbudgettypeds = async (req, res) => {
    try {
        const { username, useremail, ...bodyData } = req.body;
        const newItem = await budgettypeds.create(bodyData);
        
        await recordLog({
            username, useremail, colid: newItem.colid,
            action: 'ADD_TYPE', module: 'BUDGET_CONFIG', recordid: newItem._id,
            details: { budgettype: newItem.budgettype }
        });

        res.status(201).json({ status: 'success', data: { item: newItem } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err });
    }
};

exports.updatebudgettypeds = async (req, res) => {
    try {
        const { username, useremail, ...updateData } = req.body;
        const item = await budgettypeds.findByIdAndUpdate(req.query.id, updateData, { new: true, runValidators: true });
        
        if (item) {
            await recordLog({
                username, useremail, colid: item.colid,
                action: 'UPDATE_TYPE', module: 'BUDGET_CONFIG', recordid: item._id,
                details: { changedFields: Object.keys(updateData) }
            });
        }
        
        res.status(200).json({ status: 'success', data: { item } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err });
    }
};

exports.deletebudgettypeds = async (req, res) => {
    try {
        const { username, useremail } = req.query;
        const item = await budgettypeds.findById(req.query.id);
        if (item) {
            await recordLog({
                username, useremail, colid: item.colid,
                action: 'DELETE_TYPE', module: 'BUDGET_CONFIG', recordid: item._id,
                details: { budgettype: item.budgettype }
            });
            await budgettypeds.findByIdAndDelete(req.query.id);
        }
        res.status(204).json({ status: 'success', data: null });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err });
    }
};

exports.getallbudgettypeds = async (req, res) => {
    try {
        const { colid } = req.query;
        const items = await budgettypeds.find({ colid });
        res.status(200).json({ status: 'success', results: items.length, count: items.length, data: { items } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err });
    }
};

exports.getbudgettypedsbyid = async (req, res) => {
    try {
        const item = await budgettypeds.findById(req.query.id);
        res.status(200).json({ status: 'success', data: { item } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err });
    }
};
