const crmh1 = require('../Models/crmh1.js');
const leadactivityds = require('../Models/leadactivityds.js');
const user = require('../Models/user.js');
const sourceds = require('../Models/sourceds.js');
const ProgramCounselords = require('../Models/ProgramCounselords.js');
const unifiedlandingpageds = require('../Models/unifiedlandingpageds.js');
const Ledgerstud = require('../Models/ledgerstud.js');

const PAGE_SIZE = 5;

// Check for duplicate lead
exports.checkduplicateag = async (req, res) => {
  try {
    const { colid, phone, email } = req.query;

    if (!colid) {
      return res.status(400).json({ success: false, message: 'Colid is required' });
    }

    let query = { colid: Number(colid), $or: [] };
    if (phone) query.$or.push({ phone });
    if (email) query.$or.push({ email });

    if (query.$or.length === 0) {
      return res.status(200).json({ exists: false });
    }

    const lead = await crmh1.findOne(query).select('name assignedto phone email').lean();

    if (lead) {
      return res.status(200).json({ exists: true, lead });
    }

    res.status(200).json({ exists: false });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get all leads — paginated (page size: 5)
exports.getallleadsag = async (req, res) => {
  try {
    const { colid, user, pipeline_stage, lead_temperature, source, search, pageSize } = req.query;
    const size = parseInt(pageSize) || PAGE_SIZE;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const skip = (page - 1) * size;

    let query = {
      colid: Number(colid),
      $or: [
        { user },
        { assignedto: user },
        { assignedto: null },
        { assignedto: "" }
      ]
    };

    if (pipeline_stage && pipeline_stage !== 'All') query.pipeline_stage = pipeline_stage;
    if (lead_temperature && lead_temperature !== 'All') query.lead_temperature = lead_temperature;
    if (source && source !== 'All') query.source = source;

    const { startDate, endDate } = req.query;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    if (search) {
      query.$and = [{
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
          { category: { $regex: search, $options: 'i' } }
        ]
      }];
      delete query.$or;
    }

    const [totalCount, leads] = await Promise.all([
      crmh1.countDocuments(query),
      crmh1.find(query).sort({ updatedAt: -1 }).skip(skip).limit(size).lean()
    ]);

    const totalPages = Math.ceil(totalCount / size);

    res.status(200).json({
      success: true,
      data: leads,
      count: leads.length,
      total: totalCount, // Added for frontend consistency
      pagination: {
        totalCount, totalPages, currentPage: page, pageSize: size,
        hasNextPage: page < totalPages, hasPrevPage: page > 1
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// Get lead by ID
exports.getleadbyidag = async (req, res) => {
  try {
    const { id } = req.params;

    const [lead, activities] = await Promise.all([
      crmh1.findById(id).lean(),
      leadactivityds.find({ lead_id: id }).sort({ activity_date: -1 }).lean()
    ]);

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    res.status(200).json({ success: true, data: { lead, activities } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get hot leads — paginated
exports.gethotleadsag = async (req, res) => {
  try {
    const { colid, user } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const skip = (page - 1) * PAGE_SIZE;

    const query = {
      colid: Number(colid),
      lead_temperature: 'Hot',
      $or: [{ user }, { assignedto: user }]
    };

    const [totalCount, leads] = await Promise.all([
      crmh1.countDocuments(query),
      crmh1.find(query).sort({ lead_score: -1 }).skip(skip).limit(PAGE_SIZE).lean()
    ]);

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    res.status(200).json({
      success: true,
      data: leads,
      count: leads.length,
      pagination: {
        totalCount, totalPages, currentPage: page, pageSize: PAGE_SIZE,
        hasNextPage: page < totalPages, hasPrevPage: page > 1
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get today's follow-ups — paginated
exports.gettodayfollowupsag = async (req, res) => {
  try {
    const { colid, user } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const skip = (page - 1) * PAGE_SIZE;

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

    const query = {
      colid: Number(colid),
      next_followup_date: { $gte: today, $lt: tomorrow },
      $or: [{ user }, { assignedto: user }]
    };

    const [totalCount, leads] = await Promise.all([
      crmh1.countDocuments(query),
      crmh1.find(query).sort({ next_followup_date: 1 }).skip(skip).limit(PAGE_SIZE).lean()
    ]);

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    res.status(200).json({
      success: true,
      data: leads,
      count: leads.length,
      pagination: {
        totalCount, totalPages, currentPage: page, pageSize: PAGE_SIZE,
        hasNextPage: page < totalPages, hasPrevPage: page > 1
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get overdue follow-ups — paginated
exports.getoverduefollowupsag = async (req, res) => {
  try {
    const { colid, user } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const skip = (page - 1) * PAGE_SIZE;

    const today = new Date(); today.setHours(0, 0, 0, 0);

    const query = {
      colid: Number(colid),
      next_followup_date: { $lt: today },
      leadstatus: 'Active',
      $or: [{ user }, { assignedto: user }]
    };

    const [totalCount, leads] = await Promise.all([
      crmh1.countDocuments(query),
      crmh1.find(query).sort({ next_followup_date: 1 }).skip(skip).limit(PAGE_SIZE).lean()
    ]);

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    res.status(200).json({
      success: true,
      data: leads,
      count: leads.length,
      pagination: {
        totalCount, totalPages, currentPage: page, pageSize: PAGE_SIZE,
        hasNextPage: page < totalPages, hasPrevPage: page > 1
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get lead analytics
exports.getleadanalyticsag = async (req, res) => {
  try {
    const { colid, user } = req.query;
    const matchQuery = {
      colid: Number(colid),
      $or: [{ user }, { assignedto: user }]
    };

    const [facetResult, byLocation] = await Promise.all([
      crmh1.aggregate([
        { $match: matchQuery },
        {
          $facet: {
            counts: [{
              $group: {
                _id: null,
                total: { $sum: 1 },
                hot: { $sum: { $cond: [{ $eq: ['$lead_temperature', 'Hot'] }, 1, 0] } },
                warm: { $sum: { $cond: [{ $eq: ['$lead_temperature', 'Warm'] }, 1, 0] } },
                cold: { $sum: { $cond: [{ $eq: ['$lead_temperature', 'Cold'] }, 1, 0] } },
                converted: { $sum: { $cond: [{ $eq: ['$leadstatus', 'Converted'] }, 1, 0] } }
              }
            }],
            byStage: [
              { $group: { _id: '$pipeline_stage', count: { $sum: 1 } } },
              { $sort: { count: -1 } }
            ],
            bySource: [
              { $group: { _id: '$source', count: { $sum: 1 } } },
              { $sort: { count: -1 } }
            ],
            byCategory: [
              { $group: { _id: '$category', count: { $sum: 1 } } },
              { $sort: { count: -1 } }
            ]
          }
        }
      ]),
      crmh1.aggregate([
        { $match: matchQuery },
        { $group: { _id: { city: '$city', state: '$state' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $project: { _id: 0, city: '$_id.city', state: '$_id.state', count: 1 } }
      ])
    ]);

    const c = facetResult[0]?.counts[0] || { total: 0, hot: 0, warm: 0, cold: 0, converted: 0 };
    const conversionRate = c.total > 0 ? ((c.converted / c.total) * 100).toFixed(2) : 0;

    res.status(200).json({
      success: true,
      data: {
        totalLeads: c.total,
        hotLeads: c.hot,
        warmLeads: c.warm,
        coldLeads: c.cold,
        convertedLeads: c.converted,
        conversionRate: `${conversionRate}%`,
        byStage: facetResult[0]?.byStage || [],
        bySource: facetResult[0]?.bySource || [],
        byCategory: facetResult[0]?.byCategory || [],
        byLocation
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Search users by name or email
exports.searchusersag = async (req, res) => {
  try {
    const { query, colid } = req.query;
    if (!query) {
      return res.status(400).json({ success: false, message: 'Query parameter is required' });
    }

    const searchRegex = new RegExp(query, 'i');
    const users = await user.find({
      colid: Number(colid),
      $or: [{ name: searchRegex }, { email: searchRegex }]
    }).select('name email _id').limit(10).lean();

    res.status(200).json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ═══ CRMH Dashboard — optimized with $facet ═══
exports.getCrmhDashboard = async (req, res) => {
  try {
    const { colid, user: userEmail, role } = req.query;

    if (!colid) {
      return res.status(400).json({ success: false, message: 'colid is required' });
    }

    const numColid = Number(colid);
    if (Number.isNaN(numColid)) {
      return res.status(400).json({ success: false, message: 'valid numeric colid is required' });
    }

    const normalizedRole = String(role || '').trim().toLowerCase();
    const isPrivilegedRole = ['admin', 'all', 'crm', 'management'].includes(normalizedRole);
    const colidQuery = { $or: [{ colid: numColid }, { colid: String(colid) }] };
    const baseQuery = { $and: [colidQuery] };

    if (!isPrivilegedRole && userEmail) {
      baseQuery.$and.push({ $or: [{ user: userEmail }, { assignedto: userEmail }] });
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const skip = (page - 1) * PAGE_SIZE;

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    const oneDayAgo = new Date(today); oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const threeDaysAgo = new Date(today); threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const sevenDaysAgo = new Date(today); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const confirmedStages = ['Admitted', 'Admission Done', 'Fee Paid', 'Fees Paid', 'Seat Booked', 'ePravesh Done', 'ERP Done'];
    const confirmedStatuses = ['Admitted', 'Admission Done', 'Converted'];
    const applicationStages = ['Application Sent', 'Application Submitted', ...confirmedStages];
    const lostStages = ['Lost', 'Not Interested', 'Admission Cancelled', 'Junk Lead', 'Wrong Number', 'Not Eligible', 'Admited in Another College'];
    const lostStatuses = ['Lost', 'Rejected', 'Closed'];
    const confirmedLeadExpression = {
      $or: [
        { $in: ['$pipeline_stage', confirmedStages] },
        { $in: ['$leadstatus', confirmedStatuses] }
      ]
    };
    const applicationLeadExpression = {
      $or: [
        { $in: ['$pipeline_stage', applicationStages] },
        { $eq: ['$application_submitted', 'Yes'] }
      ]
    };
    const closedLeadExpression = {
      $or: [
        confirmedLeadExpression,
        { $in: ['$pipeline_stage', lostStages] },
        { $in: ['$leadstatus', lostStatuses] }
      ]
    };

    // ── Single $facet aggregation for ALL counts + groupings ──
    const [facetResult] = await crmh1.aggregate([
      { $match: baseQuery },
      {
        $facet: {
          // All counts in one pass
          counts: [{
            $group: {
              _id: null,
              total: { $sum: 1 },
              today: { $sum: { $cond: [{ $gte: ['$createdAt', today] }, 1, 0] } },
              month: { $sum: { $cond: [{ $gte: ['$createdAt', startOfMonth] }, 1, 0] } },
              year: { $sum: { $cond: [{ $gte: ['$createdAt', startOfYear] }, 1, 0] } },
              hot: { $sum: { $cond: [{ $eq: ['$lead_temperature', 'Hot'] }, 1, 0] } },
              warm: { $sum: { $cond: [{ $eq: ['$lead_temperature', 'Warm'] }, 1, 0] } },
              cold: { $sum: { $cond: [{ $eq: ['$lead_temperature', 'Cold'] }, 1, 0] } },
              applications: { $sum: { $cond: [applicationLeadExpression, 1, 0] } },
              confirmed: { $sum: { $cond: [confirmedLeadExpression, 1, 0] } },
              closedLeads: { $sum: { $cond: [closedLeadExpression, 1, 0] } },
              campusVisitDone: { $sum: { $cond: [{ $eq: ['$campus_visit_completed', 'Yes'] }, 1, 0] } },
              hotPending: {
                $sum: {
                  $cond: [{ $and: [{ $eq: ['$lead_temperature', 'Hot'] }, { $ne: ['$next_followup_date', null] }, { $lt: ['$next_followup_date', today] }] }, 1, 0]
                }
              },
              overdueFollowups: {
                $sum: {
                  $cond: [{ $and: [{ $ne: ['$next_followup_date', null] }, { $lt: ['$next_followup_date', today] }, { $eq: ['$leadstatus', 'Active'] }] }, 1, 0]
                }
              },
              inactive7Days: { $sum: { $cond: [{ $lt: ['$updatedAt', sevenDaysAgo] }, 1, 0] } },
              feePaidAmount: {
                $sum: {
                  $cond: [confirmedLeadExpression, { $ifNull: ['$amount', 0] }, 0]
                }
              }
            }
          }],
          // Aging: not contacted 24h
          notContacted24h: [
            {
              $match: {
                $or: [
                  { followupdate: { $lt: oneDayAgo } },
                  { followupdate: null, createdAt: { $lt: oneDayAgo } }
                ]
              }
            },
            { $count: 'count' }
          ],
          // Aging: pending 3 days
          pending3Days: [
            {
              $match: {
                $or: [
                  { followupdate: { $lt: threeDaysAgo } },
                  { followupdate: null, createdAt: { $lt: threeDaysAgo } }
                ]
              }
            },
            { $count: 'count' }
          ],
          // Pipeline stage breakdown
          pipelineStageBreakdown: [
            { $group: { _id: '$pipeline_stage', count: { $sum: 1 }, lastChanged: { $max: '$updatedAt' } } },
            { $sort: { count: -1 } }
          ],
          // Source performance
          sourcePerformance: [
            {
              $group: {
                _id: '$source',
                count: { $sum: 1 },
                conversions: { $sum: { $cond: [confirmedLeadExpression, 1, 0] } }
              }
            },
            { $sort: { count: -1 } }
          ],
          // Course-wise admitted students
          courseWiseAdmissions: [
            {
              $match: {
                $or: [
                  { pipeline_stage: { $in: confirmedStages } },
                  { leadstatus: { $in: confirmedStatuses } }
                ]
              }
            },
            { $group: { _id: { $ifNull: ['$course_interested', '$program'] }, count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ],
          // Course-wise total leads
          courseWiseLeads: [
            { $group: { _id: { $ifNull: ['$course_interested', '$program'] }, count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ],
          // Counsellor performance
          counsellorPerformance: [
            {
              $group: {
                _id: '$assignedto',
                leadsCount: { $sum: 1 },
                hotLeads: { $sum: { $cond: [{ $eq: ['$lead_temperature', 'Hot'] }, 1, 0] } },
                conversions: { $sum: { $cond: [confirmedLeadExpression, 1, 0] } }
              }
            },
            { $sort: { leadsCount: -1 } }
          ],
          // City-wise leads (top 15)
          leadsByCity: [
            { $match: { city: { $exists: true, $nin: [null, ''] } } },
            { $group: { _id: '$city', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 15 }
          ]
        }
      }
    ]);

    const c = facetResult.counts[0] || {
      total: 0, today: 0, month: 0, year: 0,
      hot: 0, warm: 0, cold: 0,
      applications: 0, confirmed: 0, closedLeads: 0,
      campusVisitDone: 0, hotPending: 0, overdueFollowups: 0,
      inactive7Days: 0, feePaidAmount: 0
    };

    const followUpAging = {
      notContacted24h: facetResult.notContacted24h[0]?.count || 0,
      pending3Days: facetResult.pending3Days[0]?.count || 0,
      hotPending: c.hotPending,
      inactive7Days: c.inactive7Days,
    };

    // ── Funnel data (computed from pipelineStageBreakdown) ──
    const funnelStageMap = {
      'New Lead': 'New Lead', 'Contact Attempted': 'Contacted', 'Contacted': 'Contacted',
      'Phone Conversation': 'Contacted', 'WhatsApp Conversation': 'Contacted',
      'Interested': 'Interested', 'Qualified': 'Interested', 'Counselling Scheduled': 'Interested',
      'Campus Visited': 'Interested', 'Follow Up': 'Interested', 'General Enquiry': 'Interested',
      'Call Reschedule': 'Interested', 'Prospect': 'Interested',
      'Application Sent': 'Applied', 'Application Submitted': 'Applied',
      'Fee Paid': 'Confirmed', 'Fees Paid': 'Confirmed', 'Admitted': 'Confirmed', 'Seat Booked': 'Confirmed',
      'ePravesh Done': 'Confirmed', 'Admission Done': 'Confirmed', 'ERP Done': 'Confirmed',
      'Lost': 'Lost', 'Not Interested': 'Lost', 'Admission Cancelled': 'Lost',
      'Junk Lead': 'Lost', 'Wrong Number': 'Lost', 'Not Eligible': 'Lost', 'Admited in Another College': 'Lost'
    };
    const funnelCounts = { 'New Lead': 0, 'Contacted': 0, 'Interested': 0, 'Applied': 0, 'Confirmed': 0, 'Lost': 0 };
    facetResult.pipelineStageBreakdown.forEach(s => {
      const mapped = funnelStageMap[s._id] || 'New Lead';
      funnelCounts[mapped] += s.count;
    });
    const funnelData = Object.entries(funnelCounts).map(([stage, count]) => ({ stage, count }));

    // ── Parallel: other collections + paginated queries ──
    const [activeSources, activePrograms, landingPages, pipelineStageChanges,
      upcomingFollowupsTotal, upcomingFollowups,
      lastFollowupTotal, lastFollowupDates,
      campusVisitsTotal, campusVisits,
      allLeads, ledgerSummaryRows
    ] = await Promise.all([
      sourceds.find({ colid: numColid, is_active: 'Yes' }).select('source_name source_type description').lean(),
      ProgramCounselords.find({ colid: numColid, is_active: 'Yes' })
        .select('course_name course_code category counsellor_name counsellor_email total_seats program_type fee_structure').lean(),
      unifiedlandingpageds.find({ colid: numColid }).select('page_name page_slug visit_count conversion_count category').lean(),
      leadactivityds.find({ colid: numColid, notes: { $regex: /Pipeline stage changed/i } })
        .sort({ activity_date: -1 }).limit(20).lean(),
      // Upcoming followups
      crmh1.countDocuments({ ...baseQuery, next_followup_date: { $gte: today } }),
      crmh1.find({ ...baseQuery, next_followup_date: { $gte: today } })
        .select('name phone email next_followup_date pipeline_stage assignedto lead_temperature colid')
        .sort({ next_followup_date: 1 }).skip(skip).limit(PAGE_SIZE).lean(),
      // Last followup dates
      crmh1.countDocuments({ ...baseQuery, followupdate: { $exists: true, $ne: null } }),
      crmh1.find({ ...baseQuery, followupdate: { $exists: true, $ne: null } })
        .select('name phone email followupdate pipeline_stage assignedto lead_temperature colid')
        .sort({ followupdate: -1 }).skip(skip).limit(PAGE_SIZE).lean(),
      // Campus visits
      crmh1.countDocuments({ ...baseQuery, campus_visit_date: { $exists: true, $ne: null } }),
      crmh1.find({ ...baseQuery, campus_visit_date: { $exists: true, $ne: null } })
        .select('name phone email campus_visit_date campus_visit_completed pipeline_stage colid')
        .sort({ campus_visit_date: -1 }).skip(skip).limit(PAGE_SIZE).lean(),
      // All leads (paginated)
      crmh1.find(baseQuery)
        .select('name phone email category course_interested source pipeline_stage leadstatus lead_temperature lead_score assignedto city state next_followup_date campus_visit_date createdAt updatedAt')
        .sort({ updatedAt: -1 }).skip(skip).limit(PAGE_SIZE).lean(),
      Ledgerstud.aggregate([
        { $match: colidQuery },
        {
          $addFields: {
            amountValue: { $ifNull: ['$amount', 0] },
            paidValue: { $ifNull: ['$paid', 0] },
            balanceValue: { $ifNull: ['$balance', 0] },
            concessionValue: { $ifNull: ['$concession', 0] },
            cashValue: { $ifNull: ['$cash', 0] },
            upiValue: { $ifNull: ['$upi', 0] },
            chequeValue: { $ifNull: ['$cheque', 0] },
            cardValue: { $ifNull: ['$card', 0] },
            pgValue: { $ifNull: ['$pg', 0] },
            neftValue: { $ifNull: ['$neft', 0] }
          }
        },
        {
          $addFields: {
            amountMinusBalance: { $subtract: ['$amountValue', '$balanceValue'] }
          }
        },
        {
          $addFields: {
            effectivePaid: {
              $cond: [
                { $gt: ['$paidValue', 0] },
                '$paidValue',
                {
                  $cond: [
                    { $lt: ['$amountValue', 0] },
                    { $abs: '$amountValue' },
                    {
                      $cond: [
                        { $gt: ['$amountMinusBalance', 0] },
                        '$amountMinusBalance',
                        0
                      ]
                    }
                  ]
                }
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: { $cond: [{ $gt: ['$amountValue', 0] }, '$amountValue', 0] } },
            totalPaid: { $sum: '$effectivePaid' },
            totalBalance: { $sum: { $cond: [{ $gt: ['$balanceValue', 0] }, '$balanceValue', 0] } },
            totalConcession: { $sum: '$concessionValue' },
            totalCash: { $sum: '$cashValue' },
            totalUPI: { $sum: '$upiValue' },
            totalCheque: { $sum: '$chequeValue' },
            totalCard: { $sum: '$cardValue' },
            totalPG: { $sum: '$pgValue' },
            totalNEFT: { $sum: '$neftValue' },
            entries: { $sum: 1 }
          }
        }
      ])
    ]);

    // ── Enrich source performance ──
    const sourceMap = {};
    activeSources.forEach(s => { sourceMap[s.source_name] = s.source_type; });
    const enrichedSourcePerformance = facetResult.sourcePerformance.map(s => ({
      ...s,
      conversionRate: s.count > 0 ? Number((((s.conversions || 0) / s.count) * 100).toFixed(1)) : 0,
      source_type: sourceMap[s._id] || 'Other',
      isRegistered: !!sourceMap[s._id]
    }));

    // ── Program performance ──
    const courseAdmMap = {};
    facetResult.courseWiseLeads.forEach(c => { courseAdmMap[c._id] = c.count; });
    const programPerformance = activePrograms.map(prog => {
      const leadsCount = courseAdmMap[prog.course_name] || 0;
      const seatUtil = prog.total_seats > 0 ? ((leadsCount / prog.total_seats) * 100).toFixed(1) : 0;
      return {
        course_name: prog.course_name, course_code: prog.course_code, category: prog.category,
        counsellor_name: prog.counsellor_name || 'Unassigned', counsellor_email: prog.counsellor_email || '',
        total_seats: prog.total_seats || 0, leads_count: leadsCount,
        seat_utilization: Number(seatUtil), program_type: prog.program_type || '',
        total_fee: prog.fee_structure?.total_fee || 0,
      };
    }).sort((a, b) => b.leads_count - a.leads_count);

    // ── Landing page stats ──
    const totalPageVisits = landingPages.reduce((sum, p) => sum + (p.visit_count || 0), 0);
    const totalPageConversions = landingPages.reduce((sum, p) => sum + (p.conversion_count || 0), 0);
    const landingPageStats = {
      total: landingPages.length,
      totalVisits: totalPageVisits,
      totalConversions: totalPageConversions,
      conversionRate: totalPageVisits > 0 ? ((totalPageConversions / totalPageVisits) * 100).toFixed(1) : '0',
      pages: landingPages.map(p => ({
        page_name: p.page_name, page_slug: p.page_slug,
        visit_count: p.visit_count || 0, conversion_count: p.conversion_count || 0,
        category: p.category || '',
        conversion_rate: (p.visit_count || 0) > 0 ? (((p.conversion_count || 0) / p.visit_count) * 100).toFixed(1) : '0'
      }))
    };

    const ledgerFinancials = ledgerSummaryRows[0] || {
      totalAmount: 0,
      totalPaid: 0,
      totalBalance: 0,
      totalConcession: 0,
      totalCash: 0,
      totalUPI: 0,
      totalCheque: 0,
      totalCard: 0,
      totalPG: 0,
      totalNEFT: 0,
      entries: 0
    };
    const totalFeesCollected = ledgerFinancials.totalPaid || c.feePaidAmount || 0;

    // ── Target vs Achieved ──
    const totalSeats = activePrograms.reduce((sum, p) => sum + (p.total_seats || 0), 0);
    const targetVsAchieved = {
      target: totalSeats, achieved: c.confirmed,
      percentage: totalSeats > 0 ? ((c.confirmed / totalSeats) * 100).toFixed(1) : '0'
    };

    const buildPagination = (total, currentPage) => ({
      totalCount: total,
      totalPages: Math.ceil(total / PAGE_SIZE),
      currentPage,
      pageSize: PAGE_SIZE,
      hasNextPage: currentPage < Math.ceil(total / PAGE_SIZE),
      hasPrevPage: currentPage > 1
    });

    res.status(200).json({
      success: true,
      data: {
        totalLeads: c.total,
        timeBasedLeads: { today: c.today, month: c.month, year: c.year },
        applicationsSubmittedCount: c.applications,
        confirmedAdmissionsCount: c.confirmed,
        closeLeadCount: c.closedLeads,
        followUpAging,
        sourcePerformance: enrichedSourcePerformance,
        activeSources,
        courseWiseAdmissions: facetResult.courseWiseAdmissions,
        courseWiseLeads: facetResult.courseWiseLeads,
        programPerformance,
        counsellorPerformance: facetResult.counsellorPerformance,
        landingPageStats,
        leadsByTemperature: { hot: c.hot, warm: c.warm, cold: c.cold },
        pipelineStageBreakdown: facetResult.pipelineStageBreakdown,
        pipelineStageChanges,
        campusVisitCompletedCount: c.campusVisitDone,
        lastVisitCount: c.campusVisitDone,
        totalFeesCollected,
        ledgerFinancials,
        funnelData,
        leadsByCity: facetResult.leadsByCity,
        overdueFollowupsCount: c.overdueFollowups,
        targetVsAchieved,
        upcomingFollowups,
        upcomingFollowupsPagination: buildPagination(upcomingFollowupsTotal, page),
        lastFollowupDates,
        lastFollowupDatesPagination: buildPagination(lastFollowupTotal, page),
        campusVisits,
        campusVisitsPagination: buildPagination(campusVisitsTotal, page),
        allLeads,
        allLeadsPagination: buildPagination(c.total, page)
      }
    });
  } catch (err) {
    console.error('Error in getCrmhDashboard:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get all active sources
exports.getallsourcesag = async (req, res) => {
  try {
    const { colid } = req.query;
    if (!colid) {
      return res.status(400).json({ success: false, message: 'colid is required' });
    }
    const sources = await sourceds.find({ colid: Number(colid), is_active: 'Yes' }).lean();
    res.status(200).json({ success: true, data: sources });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get all programs/counsellors
exports.getallprogramcounselorag = async (req, res) => {
  try {
    const { colid, category } = req.query;
    if (!colid) {
      return res.status(400).json({ success: false, message: 'colid is required' });
    }
    const query = { colid: Number(colid), is_active: 'Yes' };
    if (category) query.category = category;

    const programs = await ProgramCounselords.find(query)
      .select('course_name course_code category counsellor_name counsellor_email total_seats program_type')
      .lean();
    res.status(200).json({ success: true, data: programs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


exports.getallleaagag = exports.getallleadsag;
exports.gethotleaagag = exports.gethotleadsag;
