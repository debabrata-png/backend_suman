const lawcourtds = require('../Models/lawcourtds');

// Create Court
exports.createlawcourtds = async (req, res) => {
  try {
    const { courtname, courtlocation, colid, createduserid, createduseremail } = req.body;

    const newCourt = await lawcourtds.create({
      courtname,
      courtlocation,
      colid,
      createduserid,
      createduseremail
    });

    res.status(201).json({
      success: true,
      message: 'Court created successfully',
      data: newCourt
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating court',
      error: error.message
    });
  }
};

// Get All Courts
exports.getalllawcourtds = async (req, res) => {
  try {
    const { colid } = req.query;

    const courts = await lawcourtds.find({
      colid: parseInt(colid),
      isactive: true
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: courts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching courts',
      error: error.message
    });
  }
};

// Get Court By ID
exports.getlawcourtdsbyid = async (req, res) => {
  try {
    const { id } = req.query;

    const court = await lawcourtds.findById(id);

    if (!court) {
      return res.status(404).json({
        success: false,
        message: 'Court not found'
      });
    }

    res.status(200).json({
      success: true,
      data: court
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching court',
      error: error.message
    });
  }
};

// Update Court
exports.updatelawcourtds = async (req, res) => {
  try {
    const { id, courtname, courtlocation } = req.body;

    // Get old court name BEFORE updating
    const oldCourt = await lawcourtds.findById(id).select('courtname colid');

    if (!oldCourt) {
      return res.status(404).json({
        success: false,
        message: 'Court not found'
      });
    }

    const updatedCourt = await lawcourtds.findByIdAndUpdate(
      id,
      { courtname, courtlocation },
      { new: true }
    );


    // Cascade update to all cases with this court
    const lawformds = require('../Models/lawformds');
    const updateResult = await lawformds.updateMany(
      { courtname: oldCourt.courtname, colid: oldCourt.colid },
      { $set: { courtname: courtname } }
    );

    res.status(200).json({
      success: true,
      message: 'Court updated successfully',
      data: updatedCourt,
      casesUpdated: updateResult.modifiedCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating court',
      error: error.message
    });
  }
};

// Delete Court (Soft Delete)
exports.deletelawcourtds = async (req, res) => {
  try {
    const { id } = req.query;

    const deletedCourt = await lawcourtds.findByIdAndUpdate(
      id,
      { isactive: false },
      { new: true }
    );

    if (!deletedCourt) {
      return res.status(404).json({
        success: false,
        message: 'Court not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Court deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting court',
      error: error.message
    });
  }
};
