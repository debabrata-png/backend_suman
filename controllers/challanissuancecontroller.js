const challanissuanceds = require('../Models/challanissuanceds');

// 1. Issue a new Challan (Snapshot storage)
exports.issueChallan = async (req, res) => {
    try {
        const {
            name, user, colid, academicyear, programcode, regno,
            feegroup, feeitem, semester, feecategory,
            actualAmount, paidAmount, balance, challanNo, challanDate, comments
        } = req.body;

        const newChallan = await challanissuanceds.create({
            name: name ? name.toLowerCase() : '', // Lowercase the name as per request
            user,
            colid: parseInt(colid),
            academicyear,
            programcode,
            regno,
            feegroup,
            feeitem,
            semester,
            feecategory,
            actualAmount,
            paidAmount,
            balance,
            challanNo,
            challanDate: challanDate || new Date(),
            comments
        });

        return res.status(200).json({
            status: 'Success',
            data: newChallan
        });
    } catch (err) {
        return res.status(400).json({
            status: 'Failed',
            message: err.message
        });
    }
};

// 2. Get Challan Issuance History
exports.getChallanHistory = async (req, res) => {
    try {
        const { colid, regno, search } = req.query;
        let query = { colid: parseInt(colid) };

        if (regno) {
            query.regno = regno;
        }

        if (search) {
            // Case-insensitive search on name or challanNo
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { challanNo: { $regex: search, $options: 'i' } },
                { regno: { $regex: search, $options: 'i' } }
            ];
        }

        const history = await challanissuanceds.find(query).sort({ createdAt: -1 });

        return res.status(200).json({
            status: 'Success',
            results: history.length,
            data: history
        });
    } catch (err) {
        return res.status(400).json({
            status: 'Failed',
            message: err.message
        });
    }
};
