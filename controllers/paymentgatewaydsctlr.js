const paymentgatewayds = require('../Models/paymentgatewayds');

// Create payment gateway configuration
exports.createpaymentgatewaydsdatabyds = async (req, res) => {
  try {
    const {
      name,
      user,
      colid,
      institutionname,
      marchentid,
      saltkey,
      saltindex,
      callbackurl,
      webhookurl,
      environment,
      isTSP,
      tspClientId,
      tspClientSecret,
      tspClientVersion,
      notes
    } = req.body;

    // Check if configuration already exists
    const existingConfig = await paymentgatewayds.findOne({ colid });
    
    if (existingConfig) {
      return res.status(400).json({
        success: false,
        message: 'Payment gateway configuration already exists for this institution. Please use update instead.'
      });
    }

    const newConfig = new paymentgatewayds({
      name,
      user,
      colid,
      institutionname,
      marchentid,
      saltkey,
      saltindex,
      callbackurl,
      webhookurl,
      environment,
      isActive: true,
      isTSP: isTSP || false,
      tspClientId,
      tspClientSecret,
      tspClientVersion: tspClientVersion || "1",
      notes
    });

    await newConfig.save();

    res.status(201).json({
      success: true,
      message: 'Payment gateway configured successfully',
      data: newConfig
    });

  } catch (error) {
    // console.error('Error in createpaymentgatewaydsdatabyds:', error);
    // res.status(500).json({
    //   success: false,
    //   message: 'Failed to create payment gateway configuration',
    //   error: error.message
    // });
  }
};

// Get payment gateway configuration
exports.getpaymentgatewaydsdatabyds = async (req, res) => {
  try {
    const { colid } = req.query;

    if (!colid) {
      return res.status(400).json({
        success: false,
        message: 'colid is required'
      });
    }

    const config = await paymentgatewayds.findOne({ colid });

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Payment gateway configuration not found'
      });
    }

    res.status(200).json({
      success: true,
      data: config
    });

  } catch (error) {
    // console.error('Error in getpaymentgatewaydsdatabyds:', error);
    // res.status(500).json({
    //   success: false,
    //   message: 'Failed to fetch payment gateway configuration',
    //   error: error.message
    // });
  }
};

// Get all payment gateway configurations
exports.getallpaymentgatewaydsdatabyds = async (req, res) => {
  try {
    const configs = await paymentgatewayds.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: configs.length,
      data: configs
    });

  } catch (error) {
    // console.error('Error in getallpaymentgatewaydsdatabyds:', error);
    // res.status(500).json({
    //   success: false,
    //   message: 'Failed to fetch payment gateway configurations',
    //   error: error.message
    // });
  }
};

// Update payment gateway configuration
exports.updatepaymentgatewaydsdatabyds = async (req, res) => {
  try {
    const { colid } = req.query;
    const {
      institutionname,
      marchentid,
      saltkey,
      saltindex,
      callbackurl,
      webhookurl,
      environment,
      isTSP,
      tspClientId,
      tspClientSecret,
      tspClientVersion,
      notes
    } = req.body;

    if (!colid) {
      return res.status(400).json({
        success: false,
        message: 'colid is required'
      });
    }

    const config = await paymentgatewayds.findOne({ colid });

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Payment gateway configuration not found'
      });
    }

    // Update fields
    if (institutionname) config.institutionname = institutionname;
    if (marchentid) config.marchentid = marchentid;
    if (saltkey) config.saltkey = saltkey;
    if (saltindex) config.saltindex = saltindex;
    if (callbackurl) config.callbackurl = callbackurl;
    if (webhookurl) config.webhookurl = webhookurl;
    if (environment) config.environment = environment;
    if (isTSP !== undefined) config.isTSP = isTSP;
    if (tspClientId) config.tspClientId = tspClientId;
    if (tspClientSecret) config.tspClientSecret = tspClientSecret;
    if (tspClientVersion) config.tspClientVersion = tspClientVersion;
    if (notes) config.notes = notes;

    await config.save();

    res.status(200).json({
      success: true,
      message: 'Payment gateway configuration updated successfully',
      data: config
    });

  } catch (error) {
    // console.error('Error in updatepaymentgatewaydsdatabyds:', error);
    // res.status(500).json({
    //   success: false,
    //   message: 'Failed to update payment gateway configuration',
    //   error: error.message
    // });
  }
};

// Delete payment gateway configuration
exports.deletepaymentgatewaydsdatabyds = async (req, res) => {
  try {
    const { colid } = req.query;

    if (!colid) {
      return res.status(400).json({
        success: false,
        message: 'colid is required'
      });
    }

    const config = await paymentgatewayds.findOneAndDelete({ colid });

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Payment gateway configuration not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Payment gateway configuration deleted successfully'
    });

  } catch (error) {
    // console.error('Error in deletepaymentgatewaydsdatabyds:', error);
    // res.status(500).json({
    //   success: false,
    //   message: 'Failed to delete payment gateway configuration',
    //   error: error.message
    // });
  }
};

// Toggle active status
exports.togglepaymentgatewaydsdatabyds = async (req, res) => {
  try {
    const { colid } = req.query;

    if (!colid) {
      return res.status(400).json({
        success: false,
        message: 'colid is required'
      });
    }

    const config = await paymentgatewayds.findOne({ colid });

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Payment gateway configuration not found'
      });
    }

    config.isActive = !config.isActive;
    await config.save();

    res.status(200).json({
      success: true,
      message: `Payment gateway ${config.isActive ? 'activated' : 'deactivated'} successfully`,
      data: config
    });

  } catch (error) {
    // console.error('Error in togglepaymentgatewaydsdatabyds:', error);
    // res.status(500).json({
    //   success: false,
    //   message: 'Failed to toggle payment gateway status',
    //   error: error.message
    // });
  }
};
