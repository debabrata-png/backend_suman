const Ledgerstud = require("../Models/ledgerstud");
const User = require("../Models/user");
const Institution = require("../Models/institutions");

/**
 * Get dropdown data for DCR filters
 */
exports.getDCRDropdowns = async (req, res) => {
    try {
        const { colid } = req.query;
        if (!colid) return res.status(400).json({ success: false, message: "colid required" });

        const filter = { colid: Number(colid) };

        const [academic, feecategory, programcode, feecounter, paymode, institutions, feeitem] = await Promise.all([
            Ledgerstud.distinct("academicyear", filter),
            Ledgerstud.distinct("feecategory", filter),
            Ledgerstud.distinct("programcode", filter),
            Ledgerstud.distinct("feecounter", filter),
            Ledgerstud.distinct("paymode", filter),
            Institution.find({ admincolid: Number(colid) }, "institutionname logo colid"),
            Ledgerstud.distinct("feeitem", filter)
        ]);

        res.status(200).json({
            success: true,
            data: { academic, feecategory, programcode, feecounter, paymode, institutions, feeitem }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Universal endpoint for DCR Reports
 */
exports.getDCRReport = async (req, res) => {
    try {
        const {
            colid,
            reportFormat, // Detailed, Summary, Date Wise, etc.
            academicyear,
            feecategory,
            feebook,
            feeitem,
            programcode,
            feecounter,
            paymode,
            fromdate,
            todate,
            receiptStatus
        } = req.query;

        if (!colid) return res.status(400).json({ success: false, message: "colid required" });

        // If feebook (Institution) is selected, use its colid for matching
        let targetColid = Number(colid);
        if (feebook) targetColid = Number(feebook);

        const match = { colid: targetColid };

        // Basic Filters
        if (academicyear) match.academicyear = academicyear;
        if (feecategory) match.feecategory = feecategory;
        // if (feebook) match.feebook = feebook; // Removed as feebook is now handled via targetColid
        if (feeitem) match.feeitem = feeitem;
        if (programcode) match.programcode = programcode;
        if (feecounter) match.feecounter = feecounter;
        if (paymode) match.paymode = paymode;

        // Date Range
        if (fromdate && todate) {
            match.classdate = {
                $gte: new Date(new Date(fromdate).setHours(0, 0, 0, 0)),
                $lte: new Date(new Date(todate).setHours(23, 59, 59, 999))
            };
        }

        // Receipt Status (Handling "With Cancelled" vs regular)
        // Note: Assuming specific status values for cancellation based on common patterns
        if (receiptStatus === "Regular") {
            match.status = { $ne: "cancelled" }; 
        }

        let pipeline = [{ $match: match }];

        switch (reportFormat) {
            case "Detailed":
                pipeline.push({ $sort: { classdate: 1, regno: 1 } });
                break;

            case "Short":
                pipeline.push(
                    { $project: { classdate: 1, regno: 1, name: 1, amount: 1, paymode: 1, status: 1 } },
                    { $sort: { classdate: 1 } }
                );
                break;

            case "Summary":
                pipeline.push(
                    {
                        $group: {
                            _id: "$feeitem",
                            count: { $sum: 1 },
                            totalAmount: { $sum: "$amount" }
                        }
                    },
                    { $project: { feeitem: "$_id", count: 1, totalAmount: 1, _id: 0 } },
                    { $sort: { feeitem: 1 } }
                );
                break;

            case "Date Wise Summary":
                pipeline.push(
                    {
                        $group: {
                            _id: { $dateToString: { format: "%Y-%m-%d", date: "$classdate" } },
                            count: { $sum: 1 },
                            totalAmount: { $sum: "$amount" }
                        }
                    },
                    { $project: { date: "$_id", count: 1, totalAmount: 1, _id: 0 } },
                    { $sort: { date: 1 } }
                );
                break;

            case "Date Wise":
                pipeline.push({ $sort: { classdate: 1 } });
                break;

            case "Summary Trans. Wise":
                pipeline.push(
                    {
                        $group: {
                            _id: "$paymode",
                            count: { $sum: 1 },
                            totalAmount: { $sum: "$amount" }
                        }
                    },
                    { $project: { paymode: "$_id", count: 1, totalAmount: 1, _id: 0 } },
                    { $sort: { paymode: 1 } }
                );
                break;

            case "Summary Tran. Course Wise":
                pipeline.push(
                    {
                        $group: {
                            _id: { programcode: "$programcode", paymode: "$paymode" },
                            count: { $sum: 1 },
                            totalAmount: { $sum: "$amount" }
                        }
                    },
                    { $project: { programcode: "$_id.programcode", paymode: "$_id.paymode", count: 1, totalAmount: 1, _id: 0 } },
                    { $sort: { programcode: 1, paymode: 1 } }
                );
                break;

            case "Summary Tran. Basic Course Wise":
                // Assuming basic course is determined by some substring or specific field
                // For now, grouping by programcode as a proxy if basic course field doesn't exist
                pipeline.push(
                    {
                        $group: {
                            _id: { programcode: "$programcode" },
                            count: { $sum: 1 },
                            totalAmount: { $sum: "$amount" }
                        }
                    },
                    { $project: { basicCourse: "$_id.programcode", count: 1, totalAmount: 1, _id: 0 } },
                    { $sort: { basicCourse: 1 } }
                );
                break;

            case "PreviousYears Summary":
            case "Academic Session Summary":
                pipeline.push(
                    {
                        $group: {
                            _id: "$academicyear",
                            count: { $sum: 1 },
                            totalAmount: { $sum: "$amount" }
                        }
                    },
                    { $project: { academicyear: "$_id", count: 1, totalAmount: 1, _id: 0 } },
                    { $sort: { academicyear: -1 } }
                );
                break;

            case "Prev Session Detailed":
                // Similar to detailed but could have session-specific logic if needed
                pipeline.push({ $sort: { academicyear: -1, classdate: 1 } });
                break;

            case "DCR Details Demand Wise":
                // Placeholder: Assuming "type" might relate to demand/collection
                pipeline.push(
                    { $match: { type: { $exists: true } } },
                    { $sort: { type: 1, classdate: 1 } }
                );
                break;

            case "DCR with Scholarship":
                // Placeholder: Filter for scholarship related items
                pipeline.push(
                    { $match: { feeitem: /scholarship/i } },
                    { $sort: { classdate: 1 } }
                );
                break;

            case "DCR Details with GST":
                // Placeholder: Project fields related to tax/GST if present
                pipeline.push(
                    { $project: { classdate: 1, regno: 1, amount: 1, gst: { $literal: 0 }, total: "$amount" } },
                    { $sort: { classdate: 1 } }
                );
                break;

            case "Consolidated Summary Tran. Course Wise":
                pipeline.push(
                    {
                        $group: {
                            _id: { paymode: "$paymode" },
                            count: { $sum: 1 },
                            totalAmount: { $sum: "$amount" }
                        }
                    },
                    { $project: { paymode: "$_id.paymode", count: 1, totalAmount: 1, _id: 0 } },
                    { $sort: { paymode: 1 } }
                );
                break;

            case "DCR Details Date Wise Fee Head Description Wise":
                pipeline.push(
                    {
                        $group: {
                            _id: { date: { $dateToString: { format: "%Y-%m-%d", date: "$classdate" } }, feeitem: "$feeitem" },
                            totalAmount: { $sum: "$amount" }
                        }
                    },
                    { $project: { date: "$_id.date", feeitem: "$_id.feeitem", totalAmount: 1, _id: 0 } },
                    { $sort: { date: 1, feeitem: 1 } }
                );
                break;

            default:
                // Default to detailed for unknown formats currently
                pipeline.push({ $sort: { classdate: 1 } });
        }

        const data = await Ledgerstud.aggregate(pipeline);

        res.status(200).json({
            success: true,
            reportFormat,
            count: data.length,
            data
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
