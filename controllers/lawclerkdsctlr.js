const lawclerkds = require('../Models/lawclerkds');

// Create Law Clerk
exports.createlawclerkds = async (req, res) => {
  try {
    const { clerkname, clerkemail, clerkphone, colid, createduserid, createduseremail } = req.body;

    // Check if clerk email already exists for this college
    const existingClerk = await lawclerkds.findOne({
      clerkemail,
      colid: parseInt(colid),
      isactive: true
    });

    if (existingClerk) {
      return res.status(400).json({
        success: false,
        message: 'Law clerk with this email already exists'
      });
    }

    const newClerk = await lawclerkds.create({
      clerkname,
      clerkemail,
      clerkphone,
      colid,
      createduserid,
      createduseremail
    });

    res.status(201).json({
      success: true,
      message: 'Law clerk created successfully',
      data: newClerk
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating law clerk',
      error: error.message
    });
  }
};

// Get All Law Clerks
exports.getalllawclerkds = async (req, res) => {
  try {
    const { colid } = req.query;

    const clerks = await lawclerkds.find({
      colid: parseInt(colid),
      isactive: true
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: clerks
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching law clerks',
      error: error.message
    });
  }
};

// Get Law Clerk By ID
exports.getlawclerkdsbyid = async (req, res) => {
  try {
    const { id } = req.query;

    const clerk = await lawclerkds.findById(id);

    if (!clerk) {
      return res.status(404).json({
        success: false,
        message: 'Law clerk not found'
      });
    }

    res.status(200).json({
      success: true,
      data: clerk
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching law clerk',
      error: error.message
    });
  }
};

// Update Law Clerk
exports.updatelawclerkds = async (req, res) => {
  try {
    const { id, clerkname, clerkemail, clerkphone } = req.body;

    // Get old email BEFORE updating
    const oldClerk = await lawclerkds.findById(id).select('clerkemail colid');

    if (!oldClerk) {
      return res.status(404).json({
        success: false,
        message: 'Law clerk not found'
      });
    }

    console.log('=== LAW CLERK CASCADE UPDATE DEBUG ===');
    console.log('Old Clerk Email:', oldClerk.clerkemail);
    console.log('Old Clerk ColID:', oldClerk.colid, 'Type:', typeof oldClerk.colid);
    console.log('New Clerk Name:', clerkname);
    console.log('New Clerk Email:', clerkemail);
    console.log('New Clerk Phone:', clerkphone);

    const updatedClerk = await lawclerkds.findByIdAndUpdate(
      id,
      { clerkname, clerkemail, clerkphone },
      { new: true }
    );

    // Cascade update to all cases with this Law Clerk (match by old email)
    const lawformds = require('../Models/lawformds');

    // First, let's see how many cases have this clerk
    const casesWithClerk = await lawformds.find({
      lawclerkemail: oldClerk.clerkemail,
      colid: parseInt(oldClerk.colid)
    }).select('caseno lawclerkname lawclerkemail lawclerkphno');

    console.log('Cases found with this clerk:', casesWithClerk.length);
    console.log('Sample cases:', JSON.stringify(casesWithClerk.slice(0, 2), null, 2));

    const updateResult = await lawformds.updateMany(
      { lawclerkemail: oldClerk.clerkemail, colid: parseInt(oldClerk.colid) },
      {
        $set: {
          lawclerkname: clerkname,
          lawclerkemail: clerkemail,
          lawclerkphno: clerkphone
        }
      }
    );

    console.log('Update Result:', {
      matched: updateResult.matchedCount,
      modified: updateResult.modifiedCount,
      acknowledged: updateResult.acknowledged
    });
    console.log('=== END DEBUG ===');

    res.status(200).json({
      success: true,
      message: 'Law clerk updated successfully',
      data: updatedClerk,
      casesUpdated: updateResult.modifiedCount
    });
  } catch (error) {
    console.error('Error in updatelawclerkds:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating law clerk',
      error: error.message
    });
  }
};

// Delete Law Clerk (Soft Delete)
exports.deletelawclerkds = async (req, res) => {
  try {
    const { id } = req.query;

    const deletedClerk = await lawclerkds.findByIdAndUpdate(
      id,
      { isactive: false },
      { new: true }
    );

    if (!deletedClerk) {
      return res.status(404).json({
        success: false,
        message: 'Law clerk not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Law clerk deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting law clerk',
      error: error.message
    });
  }
};
