const pgmasterds = require('../Models/pgmasterds');

// @desc    Create new PG Master Configuration
// @route   POST /api/v2/pgmasterds/create
exports.createPGMaster = async (req, res) => {
  try {
    const newPG = await pgmasterds.create(req.body);
    res.status(201).json({
      success: true,
      data: newPG
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
};

// @desc    Get all PG Master Configurations by colid
// @route   POST /api/v2/pgmasterds/getall
exports.getAllPGMaster = async (req, res) => {
  try {
    const { colid } = req.body;
    if (!colid) {
      return res.status(400).json({ success: false, message: 'colid is required' });
    }
    const pgs = await pgmasterds.find({ colid });
    res.status(200).json({
      success: true,
      data: pgs
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
};

// @desc    Update PG Master Configuration
// @route   POST /api/v2/pgmasterds/update
exports.updatePGMaster = async (req, res) => {
  try {
    const { id } = req.query;
    const updatedPG = await pgmasterds.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true
    });
    if (!updatedPG) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }
    res.status(200).json({
      success: true,
      data: updatedPG
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
};

// @desc    Delete PG Master Configuration
// @route   GET /api/v2/pgmasterds/delete
exports.deletePGMaster = async (req, res) => {
  try {
    const { id } = req.query;
    const deletedPG = await pgmasterds.findByIdAndDelete(id);
    if (!deletedPG) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }
    res.status(200).json({
      success: true,
      message: 'Deleted successfully'
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
};
