const CrmLead = require("../Models/crmh1");
const LeadActivity = require("../Models/leadactivityds");

/*
Lead Report
*/
exports.crmdsLeadReport = async (req, res) => {

    try {

        const { counselor, colid } = req.body;

        let filter = {
            colid: colid
        };

        if (counselor && counselor !== "ALL") {
            filter.assignedto = counselor;
        }

        const leads = await CrmLead.find(filter)
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: leads.length,
            data: leads
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

};



/*
Upcoming Followup Report
*/
exports.crmdsUpcomingFollowupReport = async (req, res) => {

    try {

        const { counselor, colid, startDate, endDate } = req.body;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let filter = {
            colid: colid,
            next_followup_date: { $type: "date", $ne: null }
        };

        if (startDate && endDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            filter.next_followup_date = { ...filter.next_followup_date, $gte: start, $lte: end };
        } else {
            filter.next_followup_date = { ...filter.next_followup_date, $gte: today };
        }

        if (counselor && counselor !== "ALL") {
            filter.assignedto = counselor;
        }

        const leads = await CrmLead.find(filter)
            .sort({ next_followup_date: 1 });

        res.json({
            success: true,
            count: leads.length,
            data: leads
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

};

/*
Get Distinct Counselors
*/
exports.crmdsGetCounsellors = async (req, res) => {

    try {

        const { colid } = req.body;

        const counselors = await CrmLead.distinct(
            "assignedto",
            { colid: colid }
        );

        res.json({
            success: true,
            data: counselors
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

};

exports.crmdsOverdueLeadsReport = async (req, res) => {

    try {

        const { counselor, colid } = req.body;

        const today = new Date();

        let filter = { colid };

        if (counselor && counselor !== "ALL") {
            filter.assignedto = counselor;
        }

        const leads = await CrmLead.find(filter);

        const overdueLeads = leads.filter((lead) => {

            const pipeline = lead.pipeline_stage;

            const nextFollowup = lead.next_followup_date;

            const lastFollowup = lead.last_contact_date;

            const createdDate = lead.createdAt;

            const ageDays =
                Math.floor(
                    (today - new Date(createdDate)) /
                    (1000 * 60 * 60 * 24)
                );

            let overdue = false;

            if (pipeline === "New Lead") {
                if (nextFollowup && nextFollowup < today) {
                    overdue = true;
                }

                if (ageDays > 7 && !nextFollowup) {
                    overdue = true;
                }
            }

            return overdue;

        });

        res.json({
            success: true,
            count: overdueLeads.length,
            data: overdueLeads
        });

    } catch (err) {

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

};

exports.crmdsCounsellorWiseTotalLeadsReport = async (req, res) => {

    try {

        const { counselor, startDate, endDate, colid } = req.body;

        let filter = { colid };

        if (counselor && counselor !== "ALL") {
            filter.assignedto = counselor;
        }

        if (startDate && endDate) {
            filter.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const leads = await CrmLead.find(filter).sort({ createdAt: -1 });

        /*
        Create Summary for Graph
        */

        const summaryMap = {};

        leads.forEach((lead) => {

            const c = lead.assignedto || "Unassigned";

            if (!summaryMap[c]) {
                summaryMap[c] = {
                    counselor: c,
                    totalLeads: 0
                };
            }

            summaryMap[c].totalLeads++;

        });

        const summary = Object.values(summaryMap);

        res.json({
            success: true,
            totalLeads: leads.length,
            summary,
            data: leads
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

};

exports.crmdsSourceWiseLeadsReport = async (req, res) => {

    try {

        const { counselor, startDate, endDate, colid } = req.body;

        let filter = { colid };

        if (counselor && counselor !== "ALL") {
            filter.assignedto = counselor;
        }

        if (startDate && endDate) {
            filter.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const leads = await CrmLead.find(filter).sort({ createdAt: -1 });

        /* SOURCE SUMMARY */

        const summaryMap = {};

        leads.forEach((lead) => {

            const src = lead.source || "Unknown";

            if (!summaryMap[src]) {

                summaryMap[src] = {
                    source: src,
                    totalLeads: 0
                };

            }

            summaryMap[src].totalLeads++;

        });

        const summary = Object.values(summaryMap);

        res.json({
            success: true,
            data: leads,
            summary
        });

    } catch (err) {

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

};

exports.crmdsPipelineStageWiseReport = async (req, res) => {
    try {

        const { pipelineStage, colid, startDate, endDate } = req.body;

        let match = {
            colid: colid
        };

        if (pipelineStage && pipelineStage !== "ALL") {
            match.pipeline_stage = pipelineStage;
        }

        if (startDate && endDate) {
            match.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const result = await CrmLead.aggregate([
            { $match: match },
            {
                $group: {
                    _id: "$assignedto",   // Group by counselor
                    total: { $sum: 1 }
                }
            },
            {
                $project: {
                    counselor: { $ifNull: ["$_id", "Unassigned"] },
                    total: 1,
                    _id: 0
                }
            },
            { $sort: { total: -1 } }
        ]);

        const leads = await CrmLead.find(match).sort({ createdAt: -1 });

        res.json({
            success: true,
            data: leads,
            summary: result
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }
};

exports.crmdsDateWiseNewLeadsReport = async (req, res) => {
    try {
        const { colid, startDate, endDate } = req.body;

        let match = {
            colid: colid
        };

        if (startDate && endDate) {
            match.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        } else {
            // Default 30 days if no dates provided
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            match.createdAt = { $gte: thirtyDaysAgo };
        }

        const result = await CrmLead.aggregate([
            { $match: match },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    total: { $sum: 1 }
                }
            },
            {
                $project: {
                    date: "$_id",
                    total: 1,
                    _id: 0
                }
            },
            { $sort: { date: 1 } }
        ]);

        const leads = await CrmLead.find(match).sort({ createdAt: -1 });

        res.json({
            success: true,
            data: leads,
            summary: result
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/* 
1. Lead Status Report (Stage Wise)
Columns: Pipeline Stage, No. of Leads, Counsellor Name
*/
exports.crmdsLeadStatusStageReportV2 = async (req, res) => {
    try {
        const { colid, startDate, endDate, counselor } = req.body;
        let match = { colid };
        if (startDate && endDate) {
            match.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }
        if (counselor && counselor !== "ALL") {
            match.assignedto = counselor;
        }

        const summary = await CrmLead.aggregate([
            { $match: match },
            {
                $group: {
                    _id: {
                        stage: "$pipeline_stage",
                        counselor: "$assignedto"
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    pipelineStage: "$_id.stage",
                    counsellorName: { $ifNull: ["$_id.counselor", "Unassigned"] },
                    noOfLeads: "$count",
                    _id: 0
                }
            },
            { $sort: { pipelineStage: 1, counsellorName: 1 } }
        ]);

        res.json({ success: true, summary });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/*
2. Counsellor Performance Report
Columns: Counsellor, Total Leads, Connected, Follow Up, Admission
*/
exports.crmdsCounsellorPerformanceReportV2 = async (req, res) => {
    try {
        const { colid, startDate, endDate } = req.body;
        let match = { colid };
        if (startDate && endDate) {
            match.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        const summary = await CrmLead.aggregate([
            { $match: match },
            {
                $group: {
                    _id: "$assignedto",
                    totalLeads: { $sum: 1 },
                    connected: {
                        $sum: { $cond: [{ $in: ["$pipeline_stage", ["Connected", "WhatsApp Conversation", "Follow Up", "Admission Confirmed"]] }, 1, 0] }
                    },
                    followUp: {
                        $sum: { $cond: [{ $eq: ["$pipeline_stage", "Follow Up"] }, 1, 0] }
                    },
                    admission: {
                        $sum: { $cond: [{ $in: ["$pipeline_stage", ["Admission Confirmed", "Admission In Process"]] }, 1, 0] }
                    }
                }
            },
            {
                $project: {
                    counsellor: { $ifNull: ["$_id", "Unassigned"] },
                    totalLeads: 1,
                    connected: 1,
                    followUp: 1,
                    admission: 1,
                    _id: 0
                }
            },
            { $sort: { totalLeads: -1 } }
        ]);

        res.json({ success: true, summary });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/*
3. Daily Calling Report
Columns: Date, Counsellor, New Leads Assigned, Calls Done, Connected, Follow Up
*/
exports.crmdsDailyCallingReportV2 = async (req, res) => {
    try {
        const { colid, startDate, endDate } = req.body;
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        // 1. Get New Leads Assigned per day per counselor
        const newLeads = await CrmLead.aggregate([
            { $match: { colid, createdAt: { $gte: start, $lte: end } } },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                        counselor: "$assignedto"
                    },
                    count: { $sum: 1 }
                }
            }
        ]);

        // 2. Get Activities (Calls Done, Connected, Follow Up) per day per counselor
        const activities = await LeadActivity.aggregate([
            { $match: { colid, activity_date: { $gte: start, $lte: end }, activity_type: "call" } },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: "%Y-%m-%d", date: "$activity_date" } },
                        counselor: "$performed_by"
                    },
                    callsDone: { $sum: 1 },
                    connected: {
                        $sum: { $cond: [{ $eq: ["$outcome", "Connected"] }, 1, 0] }
                    },
                    followUp: {
                        $sum: { $cond: [{ $eq: ["$outcome", "Follow Up"] }, 1, 0] }
                    }
                }
            }
        ]);

        // Merge results
        const mergedMap = {};
        newLeads.forEach(item => {
            const key = `${item._id.date}_${item._id.counselor}`;
            mergedMap[key] = {
                date: item._id.date,
                counsellor: item._id.counselor || "Unassigned",
                newLeadsAssigned: item.count,
                callsDone: 0,
                connected: 0,
                followUp: 0
            };
        });

        activities.forEach(item => {
            const key = `${item._id.date}_${item._id.counselor}`;
            if (!mergedMap[key]) {
                mergedMap[key] = {
                    date: item._id.date,
                    counsellor: item._id.counselor,
                    newLeadsAssigned: 0,
                    callsDone: 0,
                    connected: 0,
                    followUp: 0
                };
            }
            mergedMap[key].callsDone = item.callsDone;
            mergedMap[key].connected = item.connected;
            mergedMap[key].followUp = item.followUp;
        });

        const summary = Object.values(mergedMap).sort((a, b) => b.date.localeCompare(a.date));

        res.json({ success: true, summary });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/*
4. Untouched Lead Report
Columns: Lead Name, Mobile, Assigned Counsellor, Days Pending
*/
exports.crmdsUntouchedLeadReportV2 = async (req, res) => {
    try {
        const { colid, counselor } = req.body;
        let filter = {
            colid,
            last_contact_date: null,
            leadstatus: { $ne: "Converted" },
            $expr: { $eq: ["$createdAt", "$updatedAt"] }
        };
        if (counselor && counselor !== "ALL") {
            filter.assignedto = counselor;
        }

        const leads = await CrmLead.find(filter).sort({ createdAt: 1 }).lean();
        const today = new Date();

        const data = leads.map(lead => ({
            leadName: lead.name,
            mobile: lead.phone || lead.mobile || "",
            assignedCounsellor: lead.assignedto || "Unassigned",
            daysPending: Math.floor((today - new Date(lead.createdAt)) / (1000 * 60 * 60 * 24))
        }));

        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/*
5. Follow-Up Due Report
Columns: Lead Name, Mobile, Counsellor, Follow-up Date, Status
*/
exports.crmdsFollowUpDueReportV2 = async (req, res) => {
    try {
        const { colid, counselor, startDate, endDate } = req.body;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let filter = { colid };
        if (startDate && endDate) {
            filter.next_followup_date = { $gte: new Date(startDate), $lte: new Date(endDate) };
        } else {
            filter.next_followup_date = { $lte: today }; // Overdue or due today
        }

        if (counselor && counselor !== "ALL") {
            filter.assignedto = counselor;
        }

        // Exclude admitted/converted leads
        filter.leadstatus = { $ne: "Converted" };
        
        // Dynamic follow-up check: only show if NOT updated after next_followup_date
        filter.$expr = { $lte: ["$updatedAt", "$next_followup_date"] };

        const leads = await CrmLead.find(filter).sort({ next_followup_date: 1 }).lean();

        const data = leads.map(lead => ({
            leadName: lead.name,
            mobile: lead.phone || lead.mobile || "",
            counsellor: lead.assignedto || "Unassigned",
            followupDate: lead.next_followup_date,
            status: lead.pipeline_stage
        }));

        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/*
6. Source Wise Lead Report (Enhanced)
Columns: Source, Leads, Connected, Admissions
*/
exports.crmdsSourceWiseEnhancedReportV2 = async (req, res) => {
    try {
        const { colid, startDate, endDate } = req.body;
        let match = { colid };
        if (startDate && endDate) {
            match.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        const summary = await CrmLead.aggregate([
            { $match: match },
            {
                $group: {
                    _id: "$source",
                    leads: { $sum: 1 },
                    connected: {
                        $sum: { $cond: [{ $in: ["$pipeline_stage", ["Connected", "WhatsApp Conversation", "Follow Up", "Admission Confirmed"]] }, 1, 0] }
                    },
                    admissions: {
                        $sum: { $cond: [{ $in: ["$pipeline_stage", ["Admission Confirmed", "Admission In Process"]] }, 1, 0] }
                    }
                }
            },
            {
                $project: {
                    source: { $ifNull: ["$_id", "Unknown"] },
                    leads: 1,
                    connected: 1,
                    admissions: 1,
                    _id: 0
                }
            },
            { $sort: { leads: -1 } }
        ]);

        res.json({ success: true, summary });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/*
7. Conversion Report
Columns: Counsellor, Leads, Admissions, Conversion %
*/
exports.crmdsConversionReportV2 = async (req, res) => {
    try {
        const { colid, startDate, endDate } = req.body;
        let match = { colid };
        if (startDate && endDate) {
            match.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        const summary = await CrmLead.aggregate([
            { $match: match },
            {
                $group: {
                    _id: "$assignedto",
                    leads: { $sum: 1 },
                    admissions: {
                        $sum: { $cond: [{ $in: ["$pipeline_stage", ["Admission Confirmed", "Admission In Process"]] }, 1, 0] }
                    }
                }
            },
            {
                $project: {
                    counsellor: { $ifNull: ["$_id", "Unassigned"] },
                    leads: 1,
                    admissions: 1,
                    conversionPercent: {
                        $cond: [
                            { $gt: ["$leads", 0] },
                            { $multiply: [{ $divide: ["$admissions", "$leads"] }, 100] },
                            0
                        ]
                    },
                    _id: 0
                }
            },
            { $sort: { conversionPercent: -1 } }
        ]);

        res.json({ success: true, summary });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};