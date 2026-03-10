const CrmLead = require("../Models/crmh1");

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