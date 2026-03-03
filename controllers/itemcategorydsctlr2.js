const itemcategoryds2 = require('../Models/itemcategoryds2');

exports.additemcategoryds2 = async (req, res) => {
    try {
        const newItem = await itemcategoryds2.create(req.body);
        res.status(201).json({ status: 'success', data: { item: newItem } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err });
    }
};

exports.updateitemcategoryds2 = async (req, res) => {
    try {
        const item = await itemcategoryds2.findByIdAndUpdate(req.query.id, req.body, { new: true, runValidators: true });
        res.status(200).json({ status: 'success', data: { item } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err });
    }
};

exports.deleteitemcategoryds2 = async (req, res) => {
    try {
        await itemcategoryds2.findByIdAndDelete(req.query.id);
        res.status(204).json({ status: 'success', data: null });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err });
    }
};

exports.getallitemcategoryds2 = async (req, res) => {
    try {
        const { colid, search } = req.query;
        let query = { colid };
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        const items = await itemcategoryds2.find(query);
        const debugPayload = { status: 'success', results: items.length, count: items.length, data: { items } };
        require('fs').writeFileSync('d:/Campus_technology/purchase_module/server/debug_cat.json', JSON.stringify(debugPayload, null, 2));
        res.status(200).json(debugPayload);
    } catch (err) {
        console.error("error in itemcategory getall", err);
        res.status(400).json({ status: 'fail', message: err });
    }
};

exports.getitemcategorydsbyid2 = async (req, res) => {
    try {
        const item = await itemcategoryds2.findById(req.query.id);
        res.status(200).json({ status: 'success', data: { item } });
    } catch (err) {
        res.status(400).json({ status: 'fail', message: err });
    }
};
