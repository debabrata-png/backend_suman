const universalpaymentgatewayds = require('../Models/universalpaymentgatewayds');

/**
 * @desc    Get Universal History by Regno
 * @route   POST /api/v2/universalpaymentgatewayds/gethistory
 */
exports.getHistory = async (req, res) => {
  try {
    const { colid, regno } = req.body;
    const history = await universalpaymentgatewayds.find({ colid, regno }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: history
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
};

/**
 * @desc    Get All Universal History for a College
 * @route   POST /api/v2/universalpaymentgatewayds/getallhistory
 */
exports.getAllHistory = async (req, res) => {
  try {
    const { colid, status, gatewayname, startDate, endDate } = req.body;
    
    let query = { colid };
    if (status) query.status = status;
    if (gatewayname) query.gatewayname = gatewayname;
    
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const history = await universalpaymentgatewayds.find(query).sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      data: history
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
};

