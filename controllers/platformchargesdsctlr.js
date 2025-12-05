const platformchargesds = require('../Models/platformchargesds');

// Create platform charges configuration
exports.createplatformchargesdsdatabyds = async (req, res) => {
  try {
    const {
      name,
      user,
      colid,
      institutionname,
      chargetype,
      fixedcharge,
      percentagecharge,
      minimumcharge,
      maximumcharge,
      gstApplicable,
      gstPercentage,
      chargeBearer,
      paymentTypeCharges,
      effectiveFrom,
      effectiveTo,
      notes
    } = req.body;

    // Check if configuration already exists for this colid
    const existingConfig = await platformchargesds.findOne({ colid });
    if (existingConfig) {
      return res.status(400).json({
        success: false,
        message: 'Platform charges already configured for this institution'
      });
    }

    const newConfig = new platformchargesds({
      name,
      user,
      colid,
      institutionname,
      chargetype,
      fixedcharge: fixedcharge || 0,
      percentagecharge: percentagecharge || 0,
      minimumcharge: minimumcharge || 0,
      maximumcharge,
      gstApplicable: gstApplicable !== undefined ? gstApplicable : true,
      gstPercentage: gstPercentage || 18,
      chargeBearer: chargeBearer || 'STUDENT',
      paymentTypeCharges: paymentTypeCharges || [],
      effectiveFrom: effectiveFrom || new Date(),
      effectiveTo,
      isActive: true,
      notes
    });

    await newConfig.save();

    res.status(201).json({
      success: true,
      message: 'Platform charges configured successfully',
      data: newConfig
    });

  } catch (error) {
    // console.error('Error in createplatformchargesdsdatabyds:', error);
    // res.status(500).json({
    //   success: false,
    //   message: 'Failed to create platform charges configuration',
    //   error: error.message
    // });
  }
};

// Get platform charges configuration by colid
exports.getplatformchargesdsdatabyds = async (req, res) => {
  try {
    const { colid } = req.query;

    if (!colid) {
      return res.status(400).json({
        success: false,
        message: 'colid is required'
      });
    }

    const config = await platformchargesds.findOne({ colid });

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Platform charges configuration not found'
      });
    }

    res.status(200).json({
      success: true,
      data: config
    });

  } catch (error) {
    // console.error('Error in getplatformchargesdsdatabyds:', error);
    // res.status(500).json({
    //   success: false,
    //   message: 'Failed to fetch platform charges configuration',
    //   error: error.message
    // });
  }
};

// Get active platform charges by colid
exports.getactiveplatformchargesdsdatabyds = async (req, res) => {
  try {
    const { colid } = req.query;

    if (!colid) {
      return res.status(400).json({
        success: false,
        message: 'colid is required'
      });
    }

    const config = await platformchargesds.getActiveCharges(colid);

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'No active platform charges configuration found'
      });
    }

    res.status(200).json({
      success: true,
      data: config
    });

  } catch (error) {
    // console.error('Error in getactiveplatformchargesdsdatabyds:', error);
    // res.status(500).json({
    //   success: false,
    //   message: 'Failed to fetch active platform charges',
    //   error: error.message
    // });
  }
};

// Calculate platform charges
exports.calculateplatformchargesdsdatabyds = async (req, res) => {
  try {
    const { colid, amount, paymentType } = req.query;

    if (!colid || !amount) {
      return res.status(400).json({
        success: false,
        message: 'colid and amount are required'
      });
    }

    const config = await platformchargesds.getActiveCharges(colid);

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'No active platform charges configuration found'
      });
    }

    const charges = config.calculateCharge(parseFloat(amount), paymentType);

    res.status(200).json({
      success: true,
      data: {
        originalAmount: parseFloat(amount),
        ...charges,
        finalAmount: parseFloat(amount) + charges.totalCharge,
        chargeBearer: config.chargeBearer
      }
    });

  } catch (error) {
    console.error('Error in calculateplatformchargesdsdatabyds:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate platform charges',
      error: error.message
    });
  }
};

// Get all platform charges configurations
exports.getallplatformchargesdsdatabyds = async (req, res) => {
  try {
    const { user } = req.query;

    const query = user ? { user } : {};
    const configs = await platformchargesds.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: configs.length,
      data: configs
    });

  } catch (error) {
    // console.error('Error in getallplatformchargesdsdatabyds:', error);
    // res.status(500).json({
    //   success: false,
    //   message: 'Failed to fetch platform charges configurations',
    //   error: error.message
    // });
  }
};

// Update platform charges configuration
exports.updateplatformchargesdsdatabyds = async (req, res) => {
  try {
    const { colid } = req.query;
    const updateData = req.body;

    if (!colid) {
      return res.status(400).json({
        success: false,
        message: 'colid is required'
      });
    }

    const updatedConfig = await platformchargesds.findOneAndUpdate(
      { colid },
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedConfig) {
      return res.status(404).json({
        success: false,
        message: 'Platform charges configuration not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Platform charges configuration updated successfully',
      data: updatedConfig
    });

  } catch (error) {
    // console.error('Error in updateplatformchargesdsdatabyds:', error);
    // res.status(500).json({
    //   success: false,
    //   message: 'Failed to update platform charges configuration',
    //   error: error.message
    // });
  }
};

// Delete (deactivate) platform charges configuration
exports.deleteplatformchargesdsdatabyds = async (req, res) => {
  try {
    const { colid } = req.query;

    if (!colid) {
      return res.status(400).json({
        success: false,
        message: 'colid is required'
      });
    }

    const config = await platformchargesds.findOneAndUpdate(
      { colid },
      { isActive: false },
      { new: true }
    );

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Platform charges configuration not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Platform charges configuration deactivated successfully',
      data: config
    });

  } catch (error) {
    // console.error('Error in deleteplatformchargesdsdatabyds:', error);
    // res.status(500).json({
    //   success: false,
    //   message: 'Failed to deactivate platform charges configuration',
    //   error: error.message
    // });
  }
};
