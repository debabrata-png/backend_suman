const crmh1 = require('../Models/crmh1');

// Get all leads (USER-BASED ACCESS)
exports.getallleadsdsadmin = async (req, res) => {
  try {
    const { colid, user, pipeline_stage, lead_temperature, source, search } = req.query;

    // Base query: Match leads where:
    // 1. Lead belongs to this organization (colid matches)
    // 2. Either lead.user === user (admin/owner) OR lead.assignedto === user (counsellor)
    let query = {
      colid: Number(colid),
    };

    // Apply filters
    if (pipeline_stage && pipeline_stage !== 'All') {
      query.pipeline_stage = pipeline_stage;
    }

    if (lead_temperature && lead_temperature !== 'All') {
      query.lead_temperature = lead_temperature;
    }

    if (source) {
      query.source = source;
    }

    if (search) {
      // For search, we need to combine with $or for user access
      query.$and = [
        {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } },
            { category: { $regex: search, $options: 'i' } }
          ]
        }
      ];
      // Remove the $or key since we're using $and now
      delete query.$or;
    }

    // Sort by updatedAt descending so recently modified leads appear first
    const leads = await crmh1.find(query).sort({ updatedAt: -1 });

    res.status(200).json({ success: true, data: leads, count: leads.length });
  } catch (err) {
    // res.status(500).json({ success: false, message: err.message });
  }
};