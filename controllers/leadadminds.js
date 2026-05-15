const crmh1 = require('../Models/crmh1');

// Get all leads (USER-BASED ACCESS)
exports.getallleadsdsadmin = async (req, res) => {
  try {
    const { colid, user, pipeline_stage, lead_temperature, source, search, page = 1, pageSize = 10, isExport } = req.query;

    // Base query: Match leads where:
    // 1. Lead belongs to this organization (colid matches)
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
    }

    // Handle X-DataGrid filterModel
    if (req.query.filterModel) {
      try {
        const filterModel = JSON.parse(req.query.filterModel);
        if (filterModel.items && filterModel.items.length > 0) {
          const filterQueries = filterModel.items.map(item => {
            const { field, operatorValue, value } = item;
            
            // Skip if no value for operators that require one
            if ((value === undefined || value === null || value === '') && 
                !['isEmpty', 'isNotEmpty'].includes(operatorValue)) {
              return null;
            }

            let mongoOp = {};
            let actualField = field;
            let isCustomField = false;

            if (field.startsWith('custom_')) {
              actualField = field.replace('custom_', '');
              isCustomField = true;
            }

            // Operator mapping
            let condition;
            switch (operatorValue) {
              case 'contains': condition = { $regex: value, $options: 'i' }; break;
              case 'equals': condition = value; break;
              case 'startsWith': condition = { $regex: `^${value}`, $options: 'i' }; break;
              case 'endsWith': condition = { $regex: `${value}$`, $options: 'i' }; break;
              case 'isEmpty': condition = { $exists: false }; break; // Simplified, or could check for empty string
              case 'isNotEmpty': condition = { $exists: true, $ne: "" }; break;
              case 'isAnyOf': condition = { $in: Array.isArray(value) ? value : [value] }; break;
              default: condition = { $regex: value, $options: 'i' };
            }

            if (isCustomField) {
              mongoOp = { 
                custom_fields: { 
                  $elemMatch: { 
                    field_name: actualField, 
                    field_value: condition 
                  } 
                } 
              };
            } else {
              mongoOp = { [actualField]: condition };
            }
            return mongoOp;
          }).filter(Boolean);

          if (filterQueries.length > 0) {
            if (filterModel.linkOperator === 'or') {
              if (!query.$or) query.$or = [];
              query.$or.push(...filterQueries);
            } else {
              if (!query.$and) query.$and = [];
              query.$and.push(...filterQueries);
            }
          }
        }
      } catch (e) {
        console.error("Error parsing filterModel:", e);
      }
    }

    // Handle export request - skip pagination
    if (isExport === 'true') {
      const leads = await crmh1.find(query).sort({ updatedAt: -1 }).lean();
      return res.status(200).json({ 
        success: true, 
        data: leads, 
        count: leads.length,
        isExport: true
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);

    // Sort by updatedAt descending so recently modified leads appear first
    const [totalCount, leads] = await Promise.all([
      crmh1.countDocuments(query),
      crmh1.find(query).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean()
    ]);

    res.status(200).json({ success: true, data: leads, count: leads.length, total: totalCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// Get leads by date range
exports.getLeadsByDateRange = async (req, res) => {
  try {
    const { colid, startDate, endDate, page = 1, pageSize = 10 } = req.query;

    // Validate inputs
    if (!colid || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Missing required parameters' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Include the whole end day

    const query = {
      colid: Number(colid),
      createdAt: {
        $gte: start,
        $lte: end
      }
    };

    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);

    // Fetch total count and paginated data in parallel
    const [totalCount, leads] = await Promise.all([
      crmh1.countDocuments(query),
      crmh1.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean()
    ]);

    res.status(200).json({ 
      success: true, 
      total: totalCount,
      count: leads.length, 
      data: leads 
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// Bulk Assign Counselor
exports.bulkAssignCounselor = async (req, res) => {
  try {
    const { leadIds, counselorEmail } = req.body;

    if (!leadIds || !Array.isArray(leadIds) || !counselorEmail) {
      return res.status(400).json({ success: false, message: 'Invalid input' });
    }

    const result = await crmh1.updateMany(
      { _id: { $in: leadIds } },
      { $set: { assignedto: counselorEmail } }
    );

    res.status(200).json({ success: true, message: 'Leads assigned successfully', result });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Bulk Change Lead Stage
exports.bulkChangeLeadStage = async (req, res) => {
  try {
    const { leadIds, newStage } = req.body;

    if (!leadIds || !Array.isArray(leadIds) || !newStage) {
      return res.status(400).json({ success: false, message: 'Invalid input' });
    }

    const result = await crmh1.updateMany(
      { _id: { $in: leadIds } },
      { $set: { pipeline_stage: newStage } }
    );

    res.status(200).json({ success: true, message: 'Lead stages updated successfully', result });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Bulk Transfer to Sub-Counselor
exports.bulkTransferSubCounselor = async (req, res) => {
  try {
    const { leadIds, subCounselorEmail, subCounselorName } = req.body;

    if (!leadIds || !Array.isArray(leadIds) || !subCounselorEmail) {
      return res.status(400).json({ success: false, message: 'Invalid input' });
    }

    const result = await crmh1.updateMany(
      { _id: { $in: leadIds } },
      { 
        $set: { 
          subcounselloremail: subCounselorEmail,
          subcounsellorname: subCounselorName 
        } 
      }
    );

    res.status(200).json({ success: true, message: 'Leads transferred to sub-counselor successfully', result });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};