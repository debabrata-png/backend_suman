const crmh1 = require('../Models/crmh1.js');
const categoryds = require('../Models/categoryds.js');
const leadactivityds = require('../Models/leadactivityds.js');
const dripcampaignds = require('../Models/dripcampaignds.js');
const user = require('../Models/user.js');
const unifiedlandingpageds = require('../Models/unifiedlandingpageds.js');

// Helper functions remain the same
const calculateLeadScore = (lead) => {
  let score = 0;
  if (lead.phone) score += 5;
  if (lead.email) score += 5;
  if (lead.course_interested) score += 10;
  if (lead.brochure_downloaded === 'Yes') score += 10;
  if (lead.fee_details_requested === 'Yes') score += 5;
  if (lead.counselling_session_booked === 'Yes') score += 20;
  if (lead.scholarship_interest === 'Yes') score += 10;
  if (lead.campus_visit_completed === 'Yes') score += 15;

  // Extended fields scoring
  if (lead.board10th) score += 10;
  if (lead.board12th) score += 10;
  if (lead.universityug) score += 20;

  return score;
};

const getLeadTemperature = (score) => {
  if (score >= 40) return 'Hot';
  if (score >= 20) return 'Warm';
  return 'Cold';
};

const autoAssignCounsellor = async (category, colid) => {
  try {
    const categoryDoc = await categoryds.findOne({
      category_name: category,
      colid: Number(colid),
      is_active: 'Yes'
    });

    if (!categoryDoc) {
      throw new Error('Category not found or inactive');
    }

    const activeCounsellors = categoryDoc.counsellors.filter(c => c.is_active === 'Yes');

    if (activeCounsellors.length === 0) {
      throw new Error('No active counsellors available for this category');
    }

    const randomIndex = Math.floor(Math.random() * activeCounsellors.length);
    return activeCounsellors[randomIndex].counsellor_email;
  } catch (err) {
    // console.error('Error in autoAssignCounsellor:', err);
    throw err;
  }
};

const enrollInDripCampaign = async (lead) => {
  try {
    const campaign = await dripcampaignds.findOne({
      colid: Number(lead.colid),
      campaign_type: 'welcome',
      is_active: 'Yes',
      $or: [
        { target_category: lead.category },
        { target_category: 'All' }
      ]
    });

    if (campaign) {
      lead.enrolled_drip_campaign = campaign._id.toString();
      lead.drip_campaign_status = 'Active';
    }
  } catch (err) {
    // console.error('Error enrolling in drip campaign:', err);
  }
};

// Create lead
exports.createleadds = async (req, res) => {
  try {
    req.body.colid = Number(req.body.colid);

    if (req.body.category && !req.body.assignedto) {
      req.body.assignedto = await autoAssignCounsellor(req.body.category, req.body.colid);
      req.body.assigned_date = new Date();
    }

    const initialScore = calculateLeadScore(req.body);
    req.body.lead_score = initialScore;
    req.body.lead_temperature = getLeadTemperature(initialScore);

    const lead = new crmh1(req.body);

    await enrollInDripCampaign(lead);
    await lead.save();

    await leadactivityds.create({
      lead_id: lead._id,
      colid: lead.colid,
      activity_type: 'note',
      performed_by: lead.user,
      notes: `Lead created from ${req.body.source}. Auto-assigned to ${lead.assignedto}`,
      activity_date: new Date()
    });

    if (req.body.landing_page_id) {
      try {
        await unifiedlandingpageds.findByIdAndUpdate(req.body.landing_page_id, { $inc: { conversion_count: 1 } });
      } catch (err) {
        console.error("Error updating conversion count", err);
      }
    }

    res.status(201).json({ success: true, data: lead });
  } catch (err) {
    // console.error('Error in createleadds:', err);
    // res.status(500).json({ success: false, message: err.message });
  }
};

// Check for duplicate lead
exports.checkduplicateds = async (req, res) => {
  try {
    const { colid, phone, email } = req.query;

    if (!colid) {
      return res.status(400).json({ success: false, message: 'Colid is required' });
    }

    let query = {
      colid: Number(colid),
      $or: []
    };

    if (phone) query.$or.push({ phone: phone });
    if (email) query.$or.push({ email: email });

    if (query.$or.length === 0) {
      return res.status(200).json({ exists: false });
    }

    const lead = await crmh1.findOne(query);

    if (lead) {
      return res.status(200).json({
        exists: true,
        lead: {
          name: lead.name,
          assignedto: lead.assignedto,
          phone: lead.phone,
          email: lead.email,
          _id: lead._id
        }
      });
    }

    res.status(200).json({ exists: false });
  } catch (err) {
    // res.status(500).json({ success: false, message: err.message });
  }
};

// Get all leads (USER-BASED ACCESS)
exports.getallleadsds = async (req, res) => {
  try {
    const { colid, user, role, ignoreUserFilter, pipeline_stage, lead_temperature, source, search, subcounselloremail, assignedto, attendentstatus, counselor_attendentstatus, landing_page_slug, page = 1, pageSize = 10 } = req.query;

    if (!colid) {
      return res.status(400).json({ success: false, message: 'colid is required' });
    }

    // Base query: Match leads where colid matches
    let query = {
      $and: [
        {
          $or: [
            { colid: Number(colid) },
            { colid: String(colid) }
          ]
        }
      ]
    };

    const isIgnoreFilter = ignoreUserFilter === "true" || ignoreUserFilter === true;

    // Make role checks case-insensitive
    const normalizedRole = role?.toLowerCase();
    const isPrivileged = normalizedRole === "admin" || normalizedRole === "crm" || normalizedRole === "all";

    if (!isPrivileged && !isIgnoreFilter) {
      query.$and.push({
        $or: [
          { user: user },        // User sees leads they created
          { assignedto: user },   // Counsellor sees leads assigned to them
          { subcounselloremail: user }, // Sub-counselor sees leads assigned to them
          { countercounserloeremail: user }, // Counter-counsellor sees leads for visit
          { assignedto: null },    // Unassigned leads
          { assignedto: "" }
        ]
      });
    }





    if (subcounselloremail) {
      query.subcounselloremail = subcounselloremail;
    }

    if (assignedto) {
      query.assignedto = assignedto;
    }

    // Apply filters
    if (pipeline_stage && pipeline_stage !== 'All') {
      query.pipeline_stage = pipeline_stage;
    }

    if (lead_temperature && lead_temperature !== 'All') {
      query.lead_temperature = lead_temperature;
    }

    if (source && source !== 'All') {
      query.source = source;
    }

    const { category, startDate, endDate } = req.query;
    if (category && category !== 'All') {
      // Find leads matching this category (case-insensitive regex for flexibility)
      query.category = { $regex: category, $options: 'i' };
    }

    if (startDate || endDate) {
      const dateQuery = {};
      if (startDate) {
        dateQuery.$gte = new Date(startDate);
      }
      if (endDate) {
        const endDay = new Date(endDate);
        endDay.setHours(23, 59, 59, 999);
        dateQuery.$lte = endDay;
      }
      query.createdAt = dateQuery;
    }

    if (attendentstatus === 'No') {
      query.attendentstatus = { $ne: 'Yes' };
    } else if (attendentstatus) {
      query.attendentstatus = attendentstatus;
    }

    if (counselor_attendentstatus === 'No') {
      query.counselor_attendentstatus = { $ne: 'Yes' };
    } else if (counselor_attendentstatus) {
      query.counselor_attendentstatus = counselor_attendentstatus;
    }

    if (landing_page_slug) {
      query.landing_page_slug = landing_page_slug;
    }

    if (search) {
      // For search, we bypass the assignment check and search strictly within the colid
      // So we remove the visibility restriction if it was added
      if (query.$and.length > 1) {
        query.$and.splice(1, 1);
      }

      query.$and.push({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
          { category: { $regex: search, $options: 'i' } },
          { fathername: { $regex: search, $options: 'i' } },
          { fathercontactno: { $regex: search, $options: 'i' } }
        ]
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
    console.error("[CRM] Fetch Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};


// Get lead by ID
exports.getleadbyidds = async (req, res) => {
  try {
    const { id } = req.params;

    const lead = await crmh1.findById(id);

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    const activities = await leadactivityds.find({ lead_id: id }).sort({ activity_date: -1 });

    res.status(200).json({
      success: true,
      data: {
        lead,
        activities
      }
    });
  } catch (err) {
    // res.status(500).json({ success: false, message: err.message });
  }
};

// Update lead
exports.updateleadds = async (req, res) => {
  try {
    const { id } = req.query;

    if (req.body.colid) {
      req.body.colid = Number(req.body.colid);
    }

    const lead = await crmh1.findById(id);

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    // Auto-update fields based on pipeline stage for better lead scoring
    if (req.body.pipeline_stage) {
      switch (req.body.pipeline_stage) {
        case 'Counselling Scheduled':
          req.body.counselling_session_booked = 'Yes';
          break;
        case 'Campus Visited':
          req.body.campus_visit_completed = 'Yes';
          req.body.counselling_session_booked = 'Yes';
          break;
        case 'Application Sent':
          req.body.campus_visit_completed = 'Yes';
          req.body.counselling_session_booked = 'Yes';
          req.body.brochure_downloaded = 'Yes';
          req.body.fee_details_requested = 'Yes';
          break;
        case 'Application Submitted':
        case 'Fee Paid':
        case 'Admitted':
          req.body.campus_visit_completed = 'Yes';
          req.body.counselling_session_booked = 'Yes';
          req.body.brochure_downloaded = 'Yes';
          req.body.fee_details_requested = 'Yes';
          break;
      }
    }

    const updatedLead = { ...lead.toObject(), ...req.body };
    const newScore = calculateLeadScore(updatedLead);
    req.body.lead_score = newScore;
    req.body.lead_temperature = getLeadTemperature(newScore);

    const updated = await crmh1.findByIdAndUpdate(id, req.body, { new: true });

    if (req.body.pipeline_stage && req.body.pipeline_stage !== lead.pipeline_stage) {
      await leadactivityds.create({
        lead_id: id,
        colid: lead.colid,
        activity_type: 'note',
        performed_by: req.body.updated_by || lead.user,
        notes: `Pipeline stage changed from ${lead.pipeline_stage} to ${req.body.pipeline_stage}`,
        activity_date: new Date()
      });
    }

    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    // console.error('Error in updateleadds:', err);
    // res.status(500).json({ success: false, message: err.message });
  }
};

// Update pipeline stage
exports.updatepipelinestage = async (req, res) => {
  try {
    const { id } = req.query;
    const { pipeline_stage, performed_by, notes } = req.body;

    const lead = await crmh1.findByIdAndUpdate(
      id,
      { pipeline_stage },
      { new: true }
    );

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    await leadactivityds.create({
      lead_id: id,
      colid: lead.colid,
      activity_type: 'note',
      performed_by: performed_by || lead.user,
      notes: notes || `Moved to ${pipeline_stage}`,
      activity_date: new Date()
    });

    res.status(200).json({ success: true, data: lead });
  } catch (err) {
    // res.status(500).json({ success: false, message: err.message });
  }
};

// Reassign lead
exports.reassignleadds = async (req, res) => {
  try {
    const { id } = req.query;
    const { new_counsellor_email, performed_by, reason } = req.body;

    const lead = await crmh1.findById(id);

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    const oldCounsellor = lead.assignedto;
    lead.assignedto = new_counsellor_email;
    lead.assigned_date = new Date();
    lead.reassignment_count += 1;
    await lead.save();

    await leadactivityds.create({
      lead_id: id,
      colid: lead.colid,
      activity_type: 'note',
      performed_by: performed_by || lead.user,
      notes: `Lead reassigned from ${oldCounsellor} to ${new_counsellor_email}. Reason: ${reason || 'Not specified'}`,
      activity_date: new Date()
    });

    res.status(200).json({ success: true, data: lead });
  } catch (err) {
    // res.status(500).json({ success: false, message: err.message });
  }
};

// Bulk assign leads
exports.bulkassignleadsds = async (req, res) => {
  try {
    const { lead_ids, counsellor_email, performed_by } = req.body;

    const results = [];

    for (const id of lead_ids) {
      try {
        const lead = await crmh1.findById(id);

        if (lead) {
          lead.assignedto = counsellor_email;
          lead.assigned_date = new Date();
          lead.reassignment_count += 1;
          await lead.save();

          await leadactivityds.create({
            lead_id: id,
            colid: lead.colid,
            activity_type: 'note',
            performed_by: performed_by,
            notes: `Bulk assigned to ${counsellor_email}`,
            activity_date: new Date()
          });

          results.push({ id, success: true });
        }
      } catch (err) {
        results.push({ id, success: false, error: err.message });
      }
    }

    res.status(200).json({ success: true, data: results });
  } catch (err) {
    // res.status(500).json({ success: false, message: err.message });
  }
};

// Get hot leads (USER-BASED ACCESS)
exports.gethotleadsds = async (req, res) => {
  try {
    const { colid, user } = req.query;

    let query = {
      colid: Number(colid),
      lead_temperature: 'Hot',
      $or: [
        { user: user },
        { assignedto: user }
      ]
    };

    const leads = await crmh1.find(query).sort({ lead_score: -1 });

    res.status(200).json({ success: true, data: leads, count: leads.length });
  } catch (err) {
    // res.status(500).json({ success: false, message: err.message });
  }
};

// Get today's follow-ups (USER-BASED ACCESS)
exports.gettodayfollowupsds = async (req, res) => {
  try {
    const { colid, user } = req.query;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let query = {
      colid: Number(colid),
      next_followup_date: {
        $gte: today,
        $lt: tomorrow
      },
      $or: [
        { user: user },
        { assignedto: user }
      ]
    };

    const leads = await crmh1.find(query).sort({ next_followup_date: 1 });

    res.status(200).json({ success: true, data: leads, count: leads.length });
  } catch (err) {
    // res.status(500).json({ success: false, message: err.message });
  }
};

// Get overdue follow-ups (USER-BASED ACCESS)
exports.getoverduefollowupsds = async (req, res) => {
  try {
    const { colid, user } = req.query;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let query = {
      colid: Number(colid),
      next_followup_date: { $lt: today },
      leadstatus: 'Active',
      $or: [
        { user: user },
        { assignedto: user }
      ]
    };

    const leads = await crmh1.find(query).sort({ next_followup_date: 1 });

    res.status(200).json({ success: true, data: leads, count: leads.length });
  } catch (err) {
    // res.status(500).json({ success: false, message: err.message });
  }
};

// Get lead analytics (USER-BASED ACCESS)
exports.getleadanalyticsds = async (req, res) => {
  try {
    const { colid, user, role } = req.query;

    // Match leads where:
    // 1. Lead belongs to this organization (colid matches)
    // 2. If role is Admin, CRM, or All, see all leads for this colid
    // 3. Otherwise, only see leads owned or assigned to this user
    let matchQuery = {
      colid: Number(colid)
    };

    if (role !== "Admin" && role !== "CRM" && role !== "All") {
      matchQuery.$or = [
        { user: user },        // Admin/Owner sees all their organization's leads
        { assignedto: user },   // Counsellor sees leads assigned to them
      ];
    }

    const totalLeads = await crmh1.countDocuments(matchQuery);
    const hotLeads = await crmh1.countDocuments({ ...matchQuery, lead_temperature: 'Hot' });
    const warmLeads = await crmh1.countDocuments({ ...matchQuery, lead_temperature: 'Warm' });
    const coldLeads = await crmh1.countDocuments({ ...matchQuery, lead_temperature: 'Cold' });

    const byStage = await crmh1.aggregate([
      { $match: matchQuery },
      { $group: { _id: '$pipeline_stage', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const bySource = await crmh1.aggregate([
      { $match: matchQuery },
      { $group: { _id: '$source', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const byCategory = await crmh1.aggregate([
      { $match: matchQuery },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Location-wise analytics
    const byLocation = await crmh1.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            city: '$city',
            state: '$state'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      {
        $project: {
          _id: 0,
          city: '$_id.city',
          state: '$_id.state',
          count: 1
        }
      }
    ]);

    const convertedLeads = await crmh1.countDocuments({ ...matchQuery, leadstatus: 'Converted' });
    const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(2) : 0;

    res.status(200).json({
      success: true,
      data: {
        totalLeads,
        hotLeads,
        warmLeads,
        coldLeads,
        convertedLeads,
        conversionRate: `${conversionRate}%`,
        byStage,
        bySource,
        byCategory,
        byLocation
      }
    });
  } catch (err) {
    // res.status(500).json({ success: false, message: err.message });
  }
};

// Delete lead (Admin only)
exports.deleteleadds = async (req, res) => {
  try {
    const { id } = req.params;
    const { user, role } = req.query;

    const lead = await crmh1.findById(id);

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    // Check if the requesting user has the right role to delete
    if (role !== 'Admin' && role !== 'CRM' && role !== 'All') {
      return res.status(403).json({ success: false, message: 'Unauthorized. Only Admin, CRM, or All roles can delete leads.' });
    }

    // Delete associated activities
    await leadactivityds.deleteMany({ lead_id: id });

    // Delete the lead
    await crmh1.findByIdAndDelete(id);

    res.status(200).json({ success: true, message: 'Lead and associated activities deleted successfully' });
  } catch (err) {
    // res.status(500).json({ success: false, message: err.message });
  }
};

// Search users by name or email
exports.searchusersds = async (req, res) => {
  try {
    const { query, colid } = req.query;

    if (!query) {
      return res.status(400).json({ success: false, message: 'Query parameter is required' });
    }

    const searchRegex = new RegExp(query, 'i');

    const users = await user.find({
      colid: Number(colid),
      $or: [
        { name: searchRegex },
        { email: searchRegex }
      ]
    }).select('name email _id').limit(10);

    res.status(200).json({ success: true, data: users });
  } catch (err) {
    // res.status(500).json({ success: false, message: err.message });
  }
};

exports.getProvisionalFeeLeadsds = async (req, res) => {
  const { colid } = req.query;
  try {
    const leads = await crmh1.find({
      colid: Number(colid),
      provissionalfeepaid: "Yes"
    }).sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      data: leads
    });
  } catch (err) {
    console.error("Error fetching provisional fee leads:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

exports.markleadasattendedds = async (req, res) => {
  try {
    const { id, attendername, attenderemail, assignedto } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, message: 'Lead ID is required' });
    }

    const updateData = {
      attendentstatus: 'Yes',
      attendername: attendername,
      attenderemail: attenderemail
    };

    if (assignedto) {
      updateData.assignedto = assignedto;
    }

    const lead = await crmh1.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    // Add an activity log
    await leadactivityds.create({
      lead_id: id,
      colid: lead.colid,
      activity_type: 'note',
      performed_by: attenderemail,
      notes: `Lead marked as attended by ${attendername}`,
      activity_date: new Date()
    });

    res.status(200).json({ success: true, data: lead });
  } catch (err) {
    console.error("Error marking lead as attended:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.markcounselorattendedds = async (req, res) => {
  try {
    const { id, counselor_email } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, message: 'Lead ID is required' });
    }

    const lead = await crmh1.findByIdAndUpdate(
      id,
      { counselor_attendentstatus: 'Yes' },
      { new: true }
    );

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    await leadactivityds.create({
      lead_id: id,
      colid: lead.colid,
      activity_type: 'note',
      performed_by: counselor_email,
      notes: `Lead processed and attended by Counselor ${counselor_email}`,
      activity_date: new Date()
    });

    res.status(200).json({ success: true, message: 'Lead marked as attended by counselor', data: lead });
  } catch (err) {
    console.error("markcounselorattendedds error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
