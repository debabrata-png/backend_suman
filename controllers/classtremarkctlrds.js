const ClassTRemark = require('../Models/classtremarksds');

// Fetch all predefined remarks for a college
exports.getremarksds = async (req, res) => {
    try {
        const { colid } = req.query;
        if (!colid) return res.status(400).json({ success: false, message: "colid is required" });

        const remarks = await ClassTRemark.find({ colid: Number(colid), isactive: true }).sort({ createdat: -1 });
        res.json({ success: true, remarks });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Create a new predefined remark
exports.createremarkds = async (req, res) => {
    try {
        const { colid, remark } = req.body;
        if (!colid || !remark) return res.status(400).json({ success: false, message: "colid and remark are required" });

        const newRemark = new ClassTRemark({ colid: Number(colid), remark });
        await newRemark.save();
        res.json({ success: true, message: "Remark created successfully", data: newRemark });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete a remark (soft delete)
exports.deleteremarkds = async (req, res) => {
  try {
      const { id, colid } = req.body;
      if (!id || !colid) return res.status(400).json({ success: false, message: "id and colid are required" });

      await ClassTRemark.findOneAndUpdate({ _id: id, colid: Number(colid) }, { isactive: false });
      res.json({ success: true, message: "Remark deleted successfully" });
  } catch (error) {
      res.status(500).json({ success: false, message: error.message });
  }
};
