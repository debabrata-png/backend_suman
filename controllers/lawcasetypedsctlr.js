const lawcasetypeds = require('../Models/lawcasetypeds');

// Create Case Type
exports.createlawcasetypeds = async (req, res) => {
  try {
    const { casetypename, casetypecode, colid, createduserid, createduseremail } = req.body;

    const newCaseType = await lawcasetypeds.create({
      casetypename,
      casetypecode,
      colid,
      createduserid,
      createduseremail
    });

    res.status(201).json({
      success: true,
      message: 'Case type created successfully',
      data: newCaseType
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating case type',
      error: error.message
    });
  }
};

// Get All Case Types
exports.getalllawcasetypeds = async (req, res) => {
  try {
    const { colid } = req.query;

    const caseTypes = await lawcasetypeds.find({
      colid: parseInt(colid),
      isactive: true
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: caseTypes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching case types',
      error: error.message
    });
  }
};

// Get Case Type By ID
exports.getlawcasetypedsbyid = async (req, res) => {
  try {
    const { id } = req.query;

    const caseType = await lawcasetypeds.findById(id);

    if (!caseType) {
      return res.status(404).json({
        success: false,
        message: 'Case type not found'
      });
    }

    res.status(200).json({
      success: true,
      data: caseType
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching case type',
      error: error.message
    });
  }
};

// Update Case Type
exports.updatelawcasetypeds = async (req, res) => {
  try {
    const { id, casetypename, casetypecode } = req.body;

    // Get old case type name BEFORE updating
    const oldCaseType = await lawcasetypeds.findById(id).select('casetypename colid');

    if (!oldCaseType) {
      return res.status(404).json({
        success: false,
        message: 'Case type not found'
      });
    }

    const updatedCaseType = await lawcasetypeds.findByIdAndUpdate(
      id,
      { casetypename, casetypecode },
      { new: true }
    );


    // Cascade update to all cases with this case type
    const lawformds = require('../Models/lawformds');
    const updateResult = await lawformds.updateMany(
      { caseregtype: oldCaseType.casetypename, colid: oldCaseType.colid },
      { $set: { caseregtype: casetypename } }
    );

    res.status(200).json({
      success: true,
      message: 'Case type updated successfully',
      data: updatedCaseType,
      casesUpdated: updateResult.modifiedCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating case type',
      error: error.message
    });
  }
};

// Delete Case Type (Soft Delete)
exports.deletelawcasetypeds = async (req, res) => {
  try {
    const { id } = req.query;

    const deletedCaseType = await lawcasetypeds.findByIdAndUpdate(
      id,
      { isactive: false },
      { new: true }
    );

    if (!deletedCaseType) {
      return res.status(404).json({
        success: false,
        message: 'Case type not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Case type deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting case type',
      error: error.message
    });
  }
};
