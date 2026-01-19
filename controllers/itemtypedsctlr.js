const itemtypeds = require('../Models/itemtypeds');

exports.additemtypeds = async (req, res) => {
    try {
        const newItemType = await itemtypeds.create(req.body);
        res.status(201).json({
            status: 'success',
            data: {
                itemType: newItemType
            }
        });
    } catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err
        });
    }
};

exports.updateitemtypeds = async (req, res) => {
    try {
        const itemType = await itemtypeds.findByIdAndUpdate(req.query.id, req.body, {
            new: true,
            runValidators: true
        });
        res.status(200).json({
            status: 'success',
            data: {
                itemType
            }
        });
    } catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err
        });
    }
};

exports.deleteitemtypeds = async (req, res) => {
    try {
        await itemtypeds.findByIdAndDelete(req.query.id);
        res.status(204).json({
            status: 'success',
            data: null
        });
    } catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err
        });
    }
};

exports.getallitemtypeds = async (req, res) => {
    try {
        const itemTypes = await itemtypeds.find();
        res.status(200).json({
            status: 'success',
            results: itemTypes.length,
            data: {
                itemTypes
            }
        });
    } catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err
        });
    }
};

exports.getitemtypedsbyid = async (req, res) => {
    try {
        const itemType = await itemtypeds.findById(req.query.id);
        res.status(200).json({
            status: 'success',
            data: {
                itemType
            }
        });
    } catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err
        });
    }
};
