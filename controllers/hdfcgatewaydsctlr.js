const hdfcgatewayds = require('../Models/hdfcgatewayds');

// Create HDFC gateway configuration
exports.createhdfcgatewaydsdatabyds = async (req, res) => {
  try {
    const {
      name,
      user,
      colid,
      institutionname,
      merchantid,
      apikey,
      paymentpageclientid,
      responsekey,
      baseurl,
      callbackurl,
      webhookurl,
      environment,
      enablelogging,
      loggingpath,
      notes
    } = req.body;

    // Check if configuration already exists
    const existingconfig = await hdfcgatewayds.findOne({ colid });
    if (existingconfig) {
      return res.status(400).json({
        success: false,
        message: 'HDFC gateway configuration already exists for this institution. Please use update instead.'
      });
    }

    const newconfig = new hdfcgatewayds({
      name,
      user,
      colid,
      institutionname,
      merchantid,
      apikey,
      paymentpageclientid: paymentpageclientid || 'hdfcmaster',
      responsekey,
      baseurl,
      callbackurl,
      webhookurl,
      environment: environment || 'UAT',
      isactive: true,
      enablelogging: enablelogging !== undefined ? enablelogging : true,
      loggingpath: loggingpath || './logs/hdfcpaymenthandler.log',
      notes
    });

    await newconfig.save();

    res.status(201).json({
      success: true,
      message: 'HDFC gateway configured successfully',
      data: newconfig
    });
  } catch (error) {
    // console.error('Error in createhdfcgatewaydsdatabyds:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create HDFC gateway configuration',
      error: error.message
    });
  }
};

// Get HDFC gateway configuration
exports.gethdfcgatewaydsdatabyds = async (req, res) => {
  try {
    const { colid } = req.query;
    if (!colid) {
      return res.status(400).json({
        success: false,
        message: 'colid is required'
      });
    }

    const config = await hdfcgatewayds.findOne({ colid });
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'HDFC gateway configuration not found'
      });
    }

    res.status(200).json({
      success: true,
      data: config
    });
  } catch (error) {
    // console.error('Error in gethdfcgatewaydsdatabyds:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch HDFC gateway configuration',
      error: error.message
    });
  }
};

// Get all HDFC gateway configurations
exports.getallhdfcgatewaydsdatabyds = async (req, res) => {
  try {
    const configs = await hdfcgatewayds.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: configs.length,
      data: configs
    });
  } catch (error) {
    // console.error('Error in getallhdfcgatewaydsdatabyds:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch HDFC gateway configurations',
      error: error.message
    });
  }
};

// Update HDFC gateway configuration
exports.updatehdfcgatewaydsdatabyds = async (req, res) => {
  try {
    const { colid } = req.query;
    const {
      name,
      user,
      institutionname,
      merchantid,
      apikey,
      paymentpageclientid,
      responsekey,
      baseurl,
      callbackurl,
      webhookurl,
      environment,
      enablelogging,
      loggingpath,
      notes
    } = req.body;

    if (!colid) {
      return res.status(400).json({
        success: false,
        message: 'colid is required'
      });
    }

    const config = await hdfcgatewayds.findOne({ colid });
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'HDFC gateway configuration not found'
      });
    }

    // Update fields
    if (name) config.name = name;
    if (user) config.user = user;
    if (institutionname) config.institutionname = institutionname;
    if (merchantid) config.merchantid = merchantid;
    if (apikey) config.apikey = apikey;
    if (paymentpageclientid) config.paymentpageclientid = paymentpageclientid;
    if (responsekey) config.responsekey = responsekey;
    if (baseurl) config.baseurl = baseurl;
    if (callbackurl) config.callbackurl = callbackurl;
    if (webhookurl !== undefined) config.webhookurl = webhookurl;
    if (environment) config.environment = environment;
    if (enablelogging !== undefined) config.enablelogging = enablelogging;
    if (loggingpath) config.loggingpath = loggingpath;
    if (notes !== undefined) config.notes = notes;

    await config.save();

    res.status(200).json({
      success: true,
      message: 'HDFC gateway configuration updated successfully',
      data: config
    });
  } catch (error) {
    // console.error('Error in updatehdfcgatewaydsdatabyds:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update HDFC gateway configuration',
      error: error.message
    });
  }
};

// Delete HDFC gateway configuration
exports.deletehdfcgatewaydsdatabyds = async (req, res) => {
  try {
    const { colid } = req.query;
    if (!colid) {
      return res.status(400).json({
        success: false,
        message: 'colid is required'
      });
    }

    const config = await hdfcgatewayds.findOneAndDelete({ colid });
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'HDFC gateway configuration not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'HDFC gateway configuration deleted successfully'
    });
  } catch (error) {
    // console.error('Error in deletehdfcgatewaydsdatabyds:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete HDFC gateway configuration',
      error: error.message
    });
  }
};

// Toggle active status
exports.togglehdfcgatewaydsdatabyds = async (req, res) => {
  try {
    const { colid } = req.query;
    if (!colid) {
      return res.status(400).json({
        success: false,
        message: 'colid is required'
      });
    }

    const config = await hdfcgatewayds.findOne({ colid });
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'HDFC gateway configuration not found'
      });
    }

    config.isactive = !config.isactive;
    await config.save();

    res.status(200).json({
      success: true,
      message: `HDFC gateway ${config.isactive ? 'activated' : 'deactivated'} successfully`,
      data: config
    });
  } catch (error) {
    // console.error('Error in togglehdfcgatewaydsdatabyds:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle HDFC gateway status',
      error: error.message
    });
  }
};
