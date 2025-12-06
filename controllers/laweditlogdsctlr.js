const laweditlogds = require('../Models/laweditlogds');
const lawformds = require('../Models/lawformds');

// Create Edit Log Entry
exports.createlaweditlogds = async (req, res) => {
  try {
    const {
      caseid,
      caseno,
      editedby,
      editedbyemail,
      editeduserid,
      edittype,
      changedsummary,
      olddatajson,
      newdatajson,
      colid,
      datefor,
      nextdateforhearing,
      nextdateforhearingtime
    } = req.body;

    const newLog = await laweditlogds.create({
      caseid,
      caseno,
      editedby,
      editedbyemail,
      editeduserid,
      edittype,
      changedsummary,
      olddatajson,
      newdatajson,
      colid,
      datefor,
      nextdateforhearing,
      nextdateforhearingtime
    });

    res.status(201).json({
      success: true,
      message: 'Edit log created successfully',
      data: newLog
    });
  } catch (error) {
    // res.status(500).json({
    //   success: false,
    //   message: 'Error creating edit log',
    //   error: error.message
    // });
  }
};

// Get Edit Logs By Case ID
exports.getlaweditlogdsbycaseid = async (req, res) => {
  try {
    const { caseid } = req.query;

    const logs = await laweditlogds.find({ caseid }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: logs
    });
  } catch (error) {
    // res.status(500).json({
    //   success: false,
    //   message: 'Error fetching edit logs',
    //   error: error.message
    // });
  }
};

// Get All Edit Logs (with optional filters)
exports.getalllaweditlogds = async (req, res) => {
  try {
    const { colid, caseno } = req.query;

    let query = { colid: parseInt(colid) };

    if (caseno) {
      query.caseno = { $regex: caseno, $options: 'i' };
    }

    const logs = await laweditlogds.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: logs
    });
  } catch (error) {
    // res.status(500).json({
    //   success: false,
    //   message: 'Error fetching edit logs',
    //   error: error.message
    // });
  }
};