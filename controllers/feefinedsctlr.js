const feefineds = require("../Models/feefineds");

exports.getfeefineds = async (req, res) => {
    try {
        const classes = await feefineds.find();
        res.status(200).json({
            status: 'success',
            data: {
                classes
            }
        });
    } catch (err) {
        res.status(404).json({
            status: 'fail',
            message: err
        });
    }
};

exports.createfeefineds = async (req, res) => {
    try {
        const newClass = await feefineds.create(req.body);
        res.status(201).json({
            status: 'success',
            data: {
                class: newClass
            }
        });
    } catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err
        });
    }
};

exports.updatefeefineds = async (req, res) => {
    try {
        const updatedClass = await feefineds.findByIdAndUpdate(req.query.id, req.body, {
            new: true,
            runValidators: true
        });
        res.status(200).json({
            status: 'success',
            data: {
                class: updatedClass
            }
        });
    } catch (err) {
        res.status(404).json({
            status: 'fail',
            message: err
        });
    }
};

exports.deletefeefineds = async (req, res) => {
    try {
        await feefineds.findByIdAndDelete(req.query.id);
        res.status(204).json({
            status: 'success',
            data: null
        });
    } catch (err) {
        res.status(404).json({
            status: 'fail',
            message: err
        });
    }
};

exports.getfeefinedsbyid = async (req, res) => {
    try {
        const classes = await feefineds.findById(req.query.id);
        res.status(200).json({
            status: 'success',
            data: {
                classes
            }
        });
    } catch (err) {
        res.status(404).json({
            status: 'fail',
            message: err
        });
    }
};
