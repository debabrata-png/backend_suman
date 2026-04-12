const vendorpayschds = require('../Models/vendorpayschds');

exports.addvendorpayschds = async (req, res) => {
    try {
        const result = await vendorpayschds.create(req.body);
        res.status(201).json({
            status: 'success',
            data: { result }
        });
    } catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err
        });
    }
};

exports.updatevendorpayschds = async (req, res) => {
    try {
        const result = await vendorpayschds.findByIdAndUpdate(req.query.id, req.body, {
            new: true,
            runValidators: true
        });
        res.status(200).json({
            status: 'success',
            data: { result }
        });
    } catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err
        });
    }
};

exports.deletevendorpayschds = async (req, res) => {
    try {
        await vendorpayschds.findByIdAndDelete(req.query.id);
        res.status(200).json({
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

exports.getallvendorpayschds = async (req, res) => {
    try {
        const { colid, search, vendorid, poid } = req.query;
        let query = { colid };
        if (vendorid) query.vendorid = vendorid;
        if (poid) query.poid = poid;
        
        if (search) {
            query.$or = [
                { vendorname: { $regex: search, $options: 'i' } },
                { deliverydesc: { $regex: search, $options: 'i' } },
                { paymentdesc: { $regex: search, $options: 'i' } }
            ];
        }
        const results = await vendorpayschds.find(query);
        res.status(200).json({
            status: 'success',
            results: results.length,
            count: results.length,
            data: {
                results
            }
        });
    } catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err
        });
    }
};

exports.getvendorpayschdsbyid = async (req, res) => {
    try {
        const result = await vendorpayschds.findById(req.query.id);
        res.status(200).json({
            status: 'success',
            data: {
                result
            }
        });
    } catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err
        });
    }
};
