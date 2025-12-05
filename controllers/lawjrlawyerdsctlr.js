const lawjrlawyerds = require('../Models/lawjrlawyerds');

// Create Jr Lawyer
exports.createlawjrlawyerds = async (req, res) => {
  try {
    const { jrlawyername, jrlawyeremail, jrlawyerphone, colid, createduserid, createduseremail } = req.body;

    // Check if jr lawyer email already exists for this college
    const existingLawyer = await lawjrlawyerds.findOne({
      jrlawyeremail,
      colid: parseInt(colid),
      isactive: true
    });

    if (existingLawyer) {
      return res.status(400).json({
        success: false,
        message: 'Jr lawyer with this email already exists'
      });
    }

    const newLawyer = await lawjrlawyerds.create({
      jrlawyername,
      jrlawyeremail,
      jrlawyerphone,
      colid,
      createduserid,
      createduseremail
    });

    res.status(201).json({
      success: true,
      message: 'Jr lawyer created successfully',
      data: newLawyer
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating jr lawyer',
      error: error.message
    });
  }
};

// Get All Jr Lawyers
exports.getalllawjrlawyerds = async (req, res) => {
  try {
    const { colid } = req.query;

    const lawyers = await lawjrlawyerds.find({
      colid: parseInt(colid),
      isactive: true
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: lawyers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching jr lawyers',
      error: error.message
    });
  }
};

// Get Jr Lawyer By ID
exports.getlawjrlawyerdsbyid = async (req, res) => {
  try {
    const { id } = req.query;

    const lawyer = await lawjrlawyerds.findById(id);

    if (!lawyer) {
      return res.status(404).json({
        success: false,
        message: 'Jr lawyer not found'
      });
    }

    res.status(200).json({
      success: true,
      data: lawyer
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching jr lawyer',
      error: error.message
    });
  }
};

// Update Jr Lawyer
exports.updatelawjrlawyerds = async (req, res) => {
  try {
    const { id, jrlawyername, jrlawyeremail, jrlawyerphone } = req.body;

    // Get old email BEFORE updating
    const oldLawyer = await lawjrlawyerds.findById(id).select('jrlawyeremail colid');

    if (!oldLawyer) {
      return res.status(404).json({
        success: false,
        message: 'Jr lawyer not found'
      });
    }

    const updatedLawyer = await lawjrlawyerds.findByIdAndUpdate(
      id,
      { jrlawyername, jrlawyeremail, jrlawyerphone },
      { new: true }
    );

    // Cascade update to all cases with this Jr Lawyer (match by email in array)
    const lawformds = require('../Models/lawformds');

    const updateResult = await lawformds.updateMany(
      {
        'jrlawyer.email': oldLawyer.jrlawyeremail,
        colid: parseInt(oldLawyer.colid)
      },
      {
        $set: {
          'jrlawyer.$[elem].name': jrlawyername,
          'jrlawyer.$[elem].email': jrlawyeremail,
          'jrlawyer.$[elem].phno': jrlawyerphone
        }
      },
      {
        arrayFilters: [{ 'elem.email': oldLawyer.jrlawyeremail }]
      }
    );

    res.status(200).json({
      success: true,
      message: 'Jr lawyer updated successfully',
      data: updatedLawyer,
      casesUpdated: updateResult.modifiedCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating jr lawyer',
      error: error.message
    });
  }
};

// Delete Jr Lawyer (Soft Delete)
exports.deletelawjrlawyerds = async (req, res) => {
  try {
    const { id } = req.query;

    const deletedLawyer = await lawjrlawyerds.findByIdAndUpdate(
      id,
      { isactive: false },
      { new: true }
    );

    if (!deletedLawyer) {
      return res.status(404).json({
        success: false,
        message: 'Jr lawyer not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Jr lawyer deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting jr lawyer',
      error: error.message
    });
  }
};
