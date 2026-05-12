const ClassNew = require('./../Models/classnew');

// 🔍 Get classes by colid
// exports.swapGetClasses = async (req, res) => {
//     try {
//         const { colid } = req.query;

//         const classes = await ClassNew.find({ colid });

//         res.json(classes);
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// };

// 👨‍🏫 Get unique faculty list
exports.swapGetUsers = async (req, res) => {
    try {
        const { colid } = req.query;

        const users = await ClassNew.distinct("user", { colid: Number(colid) });

        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


// 🔍 Get classes with filters
exports.swapGetClasses = async (req, res) => {
    try {
        const { colid, date, user } = req.query;

        let filter = { colid: Number(colid) };

        if (date) {
            const start = new Date(date);
            const end = new Date(date);
            end.setHours(23, 59, 59, 999);

            filter.classdate = { $gte: start, $lte: end };
        }

        if (user) {
            filter.user = user;
        }

        const classes = await ClassNew.find(filter);

        res.json(classes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 🔄 Swap two classes
exports.swapClasses = async (req, res) => {
    try {
        const { class1Id, class2Id, colid } = req.body;

        const class1 = await ClassNew.findOne({ _id: class1Id, colid });
        const class2 = await ClassNew.findOne({ _id: class2Id, colid });

        if (!class1 || !class2) {
            return res.status(404).json({ message: 'Classes not found' });
        }

        // Swap timing
        const tempDate = class1.classdate;
        const tempTime = class1.classtime;

        class1.classdate = class2.classdate;
        class1.classtime = class2.classtime;

        class2.classdate = tempDate;
        class2.classtime = tempTime;

        await class1.save();
        await class2.save();

        res.json({ message: 'Classes swapped successfully' });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};