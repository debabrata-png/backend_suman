const Ledgerstud = require("../Models/ledgerstud.js");

// ─────────────────────────────────────────────────────────────────────────────
// Helper: grand totals from rows
// ─────────────────────────────────────────────────────────────────────────────
const calcGrandTotals = (rows) =>
  rows.reduce(
    (acc, row) => {
      acc.Cash += row.Cash || 0;
      acc.UPI += row.UPI || 0;
      acc.NEFT += row.NEFT || 0;
      acc.Cheque += row.Cheque || 0;
      acc.PG += row.PG || 0;
      acc.totalPaidByPaymode += row.totalPaidByPaymode || 0;
      acc.totalAmount += row.totalAmount || 0;
      acc.totalPaid += row.totalPaid || 0;
      acc.totalConcession += row.totalConcession || 0;
      acc.totalBalance += row.totalBalance || 0;
      acc.txnCount += row.txnCount || 0;
      return acc;
    },
    {
      Cash: 0, UPI: 0, NEFT: 0, Cheque: 0, PG: 0,
      totalPaidByPaymode: 0, totalAmount: 0, totalPaid: 0,
      totalConcession: 0, totalBalance: 0, txnCount: 0
    }
  );

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v2/studentledgerdaterangereportds
// Required: colid, fromdate, todate
// Optional: regno, semester, academicyear, programcode, feeitem
//           groupby = "feeitem" (default) | "student"
// ─────────────────────────────────────────────────────────────────────────────
exports.studentLedgerDateRangeReport = async (req, res) => {
  try {
    const { colid, fromdate, todate, regno, semester,
      academicyear, programcode, feeitem, groupby } = req.query;

    if (!colid) return res.status(400).json({ success: false, message: "colid is required" });
    if (!fromdate || !todate) return res.status(400).json({ success: false, message: "fromdate and todate are required" });

    const from = new Date(fromdate);
    const to = new Date(todate);
    to.setHours(23, 59, 59, 999);
    if (isNaN(from) || isNaN(to))
      return res.status(400).json({ success: false, message: "Invalid date format. Use YYYY-MM-DD" });

    // ── Match stage ────────────────────────────────────────────────────────
    const matchStage = { colid: Number(colid), classdate: { $gte: from, $lte: to } };
    if (regno) matchStage.regno = String(regno);
    if (semester) matchStage.semester = String(semester);
    if (academicyear) matchStage.academicyear = String(academicyear);
    if (programcode) matchStage.programcode = String(programcode);
    if (feeitem) matchStage.feeitem = String(feeitem);

    // Debug: log the query being run
    //console.log('[LedgerReport] matchStage:', JSON.stringify(matchStage));
    const matchCount = await Ledgerstud.countDocuments(matchStage);
    //console.log('[LedgerReport] matching documents:', matchCount);

    const paymodeGroup = {
      totalCash:       { $sum: { $ifNull: ["$cash",       0] } },
      totalUPI:        { $sum: { $ifNull: ["$upi",        0] } },
      totalNEFT:       { $sum: { $ifNull: ["$neft",       0] } },
      totalCheque:     { $sum: { $ifNull: ["$cheque",     0] } },
      totalPG:         { $sum: { $ifNull: ["$pg",         0] } },
      totalDue:        { $sum: { $cond: [{ $gt: ["$amount", 0] }, "$amount", 0] } },
      totalPaid:       { $sum: { $cond: [{ $lt: ["$amount", 0] }, { $abs: "$amount" }, 0] } },
      totalConcession: { $sum: { $ifNull: ["$concession", 0] } },
      totalBalance:    { $sum: { $ifNull: ["$balance",    0] } },
      txnCount:        { $sum: 1 },
    };

    const paymodeProject = {
      _id: 0,
      Cash: "$totalCash",
      UPI: "$totalUPI",
      NEFT: "$totalNEFT",
      Cheque: "$totalCheque",
      PG: "$totalPG",
      totalPaidByPaymode: {
        $add: ["$totalCash", "$totalUPI", "$totalNEFT", "$totalCheque", "$totalPG"]
      },
      totalAmount: "$totalDue",
      totalPaid: "$totalPaid",
      totalConcession: 1,
      totalBalance: 1,
      txnCount: 1,
    };

    let reportRows;
    if (groupby === "student") {
      // ── Student-wise view ──────────────────────────────────────────────
      reportRows = await Ledgerstud.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: { regno: "$regno", student: "$student", feeitem: "$feeitem" },
            ...paymodeGroup,
          }
        },
        {
          $project: {
            ...paymodeProject,
            regno: "$_id.regno",
            student: "$_id.student",
            feeitem: "$_id.feeitem",
          }
        },
        { $sort: { student: 1, regno: 1, feeitem: 1 } },
      ]);
    } else {
      // ── Fee-item-wise view (default) ───────────────────────────────────
      reportRows = await Ledgerstud.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: "$feeitem",
            ...paymodeGroup,
            students: { $addToSet: { regno: "$regno", student: "$student" } },
          }
        },
        {
          $project: {
            ...paymodeProject,
            feeitem: "$_id",
            students: 1,
          }
        },
        { $sort: { feeitem: 1 } },
      ]);
    }

    const grandTotals = calcGrandTotals(reportRows);

    return res.status(200).json({
      success: true,
      groupby: groupby || "feeitem",
      filters: {
        colid, fromdate, todate,
        regno: regno || null,
        semester: semester || null,
        academicyear: academicyear || null,
        programcode: programcode || null,
        feeitem: feeitem || null,
      },
      paymodes: ["Cash", "UPI", "NEFT", "Cheque", "PG"],
      data: reportRows,
      grandTotals,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error generating student ledger date range report",
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v2/programwisecashbookreportds
// Required: colid, fromdate, todate
// Aggregates collection by programcode
// ─────────────────────────────────────────────────────────────────────────────
exports.programWiseCashbookReport = async (req, res) => {
  try {
    const { colid, fromdate, todate } = req.query;

    if (!colid) return res.status(400).json({ success: false, message: "colid is required" });
    if (!fromdate || !todate) return res.status(400).json({ success: false, message: "fromdate and todate are required" });

    const from = new Date(fromdate);
    const to = new Date(todate);
    to.setHours(23, 59, 59, 999);

    if (isNaN(from) || isNaN(to))
      return res.status(400).json({ success: false, message: "Invalid date format. Use YYYY-MM-DD" });

    const matchStage = { 
      colid: Number(colid), 
      classdate: { $gte: from, $lte: to } 
    };

    const reportRows = await Ledgerstud.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$programcode",
          Cash:       { $sum: { $ifNull: ["$cash",       0] } },
          UPI:        { $sum: { $ifNull: ["$upi",        0] } },
          NEFT:       { $sum: { $ifNull: ["$neft",       0] } },
          Cheque:     { $sum: { $ifNull: ["$cheque",     0] } },
          PG:         { $sum: { $ifNull: ["$pg",         0] } },
          totalDue:        { $sum: { $cond: [{ $gt: ["$amount", 0] }, "$amount", 0] } },
          totalPaid:       { $sum: { $cond: [{ $lt: ["$amount", 0] }, { $abs: "$amount" }, 0] } },
          totalConcession: { $sum: { $ifNull: ["$concession", 0] } },
          totalBalance:    { $sum: { $ifNull: ["$balance",    0] } },
          txnCount:        { $sum: 1 },
        }
      },
      {
        $project: {
          _id: 0,
          programcode: { $ifNull: ["$_id", "Unknown"] },
          Cash: 1, UPI: 1, NEFT: 1, Cheque: 1, PG: 1,
          totalPaidByPaymode: {
            $add: ["$Cash", "$UPI", "$NEFT", "$Cheque", "$PG"]
          },
          totalAmount: "$totalDue",
          totalPaid: "$totalPaid",
          totalConcession: 1, totalBalance: 1, txnCount: 1,
        }
      },
      { $sort: { programcode: 1 } },
    ]);

    const grandTotals = calcGrandTotals(reportRows);

    return res.status(200).json({
      success: true,
      filters: { colid, fromdate, todate },
      data: reportRows,
      grandTotals,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error generating program wise cashbook report",
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v2/getdistinctledgervaluesds
// Returns distinct values for any allowed field (feeitem, programcode,
// academicyear, semester) from the Ledgerstud collection.
// Query: colid*, field* (one of: feeitem|programcode|academicyear|semester)
// ─────────────────────────────────────────────────────────────────────────────
const ALLOWED_DISTINCT_FIELDS = ["feeitem", "programcode", "academicyear", "semester"];

exports.getDistinctLedgerValues = async (req, res) => {
  try {
    const { colid, field } = req.query;
    if (!colid) return res.status(400).json({ success: false, message: "colid is required" });
    if (!field || !ALLOWED_DISTINCT_FIELDS.includes(field))
      return res.status(400).json({ success: false, message: `field must be one of: ${ALLOWED_DISTINCT_FIELDS.join(",")}` });

    const values = await Ledgerstud.distinct(field, { colid: Number(colid) });
    return res.status(200).json({
      success: true,
      field,
      data: values.filter(Boolean).sort(),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching distinct values", error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// (Existing functions below – unchanged)
// ─────────────────────────────────────────────────────────────────────────────
exports.studentLedgerReportds = async (req, res) => {
  try {
    const { regno, colid, semester } = req.query;

    if (!regno || !colid) {
      return res.status(400).json({ success: false, message: "regno and colid are required" });
    }

    const matchFilter = { regno: String(regno), colid: Number(colid) };
    if (semester) matchFilter.semester = String(semester);

    const ledgerData = await Ledgerstud.aggregate([
      { $match: matchFilter },
      {
        $addFields: {
          amountType: { $cond: [{ $gte: ["$amount", 0] }, "payable", "paid"] },
          absoluteAmount: { $abs: "$amount" },
        },
      },
      { $sort: { createdAt: 1 } },
      {
        $facet: {
          transactions: [
            {
              $project: {
                _id: 1, feeitem: 1, feecategory: 1, amount: 1, amountType: 1,
                paymode: 1, paydetails: 1, comments: 1, academicyear: 1,
                installment: 1, semester: 1, createdAt: 1,
              },
            },
          ],
          summary: [
            {
              $group: {
                _id: null,
                totalPayable: { $sum: { $cond: [{ $gt: ["$amount", 0] }, "$amount", 0] } },
                totalPaid: { $sum: { $cond: [{ $lt: ["$amount", 0] }, { $abs: "$amount" }, 0] } },
                transactionCount: { $sum: 1 },
              },
            },
          ],
        },
      },
      {
        $project: {
          transactions: 1,
          summary: {
            $map: {
              input: "$summary",
              as: "sum",
              in: {
                totalPayable: "$$sum.totalPayable",
                totalPaid: "$$sum.totalPaid",
                balance: { $subtract: ["$$sum.totalPayable", "$$sum.totalPaid"] },
                transactionCount: "$$sum.transactionCount",
              },
            },
          },
        },
      },
    ]);

    if (!ledgerData || ledgerData.length === 0) {
      return res.status(404).json({ success: false, message: "No ledger data found for this student" });
    }

    const result = ledgerData[0];
    const summaryData = result.summary[0] || { totalPayable: 0, totalPaid: 0, balance: 0, transactionCount: 0 };

    const studentDetails = await Ledgerstud.findOne(matchFilter).select("name student regno").limit(1);

    res.status(200).json({
      success: true,
      data: {
        student: { name: studentDetails?.student || "N/A", regno, colid, semester: semester || "All Semesters" },
        transactions: result.transactions,
        summary: summaryData,
      },
    });
  } catch (error) {
    // silently swallow errors (existing behaviour)
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v2/studentledgerwisereportds
// Filters: colid*, programcode, academicyear, feeitem
// Logic: If 'paid' is missing, it's calculated as amount - balance.
// ─────────────────────────────────────────────────────────────────────────────
exports.studentLedgerWiseReportds = async (req, res) => {
  try {
    const { colid, programcode, academicyear, feeitem, fromdate, todate } = req.query;

    if (!colid) {
      return res.status(400).json({ success: false, message: "colid is required" });
    }

    const matchStage = { colid: Number(colid) };

    if (fromdate || todate) {
      matchStage.$expr = { $or: [] };
      
      const dateToStr = (field) => ({
        $dateToString: {
          format: "%Y-%m-%d",
          date: { $toDate: field },
          timezone: "+05:30"
        }
      });

      const classDateToStr = dateToStr("$classdate");
      const paidDateToStr = dateToStr("$paiddate");

      const buildRangeMatch = (dateFieldStr) => {
        const conditions = [];
        if (fromdate) conditions.push({ $gte: [dateFieldStr, fromdate] });
        if (todate)   conditions.push({ $lte: [dateFieldStr, todate]   });
        return conditions.length > 1 ? { $and: conditions } : conditions[0];
      };

      if (fromdate || todate) {
        matchStage.$expr.$or.push(buildRangeMatch(classDateToStr));
        matchStage.$expr.$or.push(buildRangeMatch(paidDateToStr));
      }
    }

    if (programcode && programcode.trim()) matchStage.programcode = String(programcode);
    if (academicyear && academicyear.trim()) matchStage.academicyear = String(academicyear);
    if (feeitem && feeitem.trim()) matchStage.feeitem = String(feeitem);

    const reportRows = await Ledgerstud.aggregate([
      { $match: matchStage },
      {
        $addFields: {
          // If paid is null or 0, calculate from amount and balance
          effectivePaid: {
            $cond: [
              { $gt: [{ $ifNull: ["$paid", 0] }, 0] },
              "$paid",
              { $subtract: [{ $ifNull: ["$amount", 0] }, { $ifNull: ["$balance", 0] }] }
            ]
          },
          statusText: {
            $cond: [{ $eq: [{ $ifNull: ["$balance", 0] }, 0] }, "Full Payment", "Pending"]
          }
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          regno: 1,
          student: 1,
          feeitem: 1,
          amount: { $ifNull: ["$amount", 0] },
          paid: "$effectivePaid",
          balance: { $ifNull: ["$balance", 0] },
          concession: { $ifNull: ["$concession", 0] },
          cash: { $ifNull: ["$cash", 0] },
          upi: { $ifNull: ["$upi", 0] },
          cheque: { $ifNull: ["$cheque", 0] },
          card: { $ifNull: ["$card", 0] },
          pg: { $ifNull: ["$pg", 0] },
          neft: { $ifNull: ["$neft", 0] },
          status: "$statusText",
          programcode: 1,
          academicyear: 1,
          classdate: 1
        }
      },
      { $sort: { name: 1, classdate: -1 } }
    ]);

    // Calculate Grand Totals
    const grandTotals = reportRows.reduce((acc, row) => {
      acc.totalAmount += row.amount;
      acc.totalPaid += row.paid;
      acc.totalBalance += row.balance;
      acc.totalConcession += row.concession;
      acc.totalCash += row.cash;
      acc.totalUPI += row.upi;
      acc.totalCheque += row.cheque;
      acc.totalCard += row.card;
      acc.totalPG += row.pg;
      acc.totalNEFT += row.neft;
      return acc;
    }, {
      totalAmount: 0, totalPaid: 0, totalBalance: 0, totalConcession: 0,
      totalCash: 0, totalUPI: 0, totalCheque: 0, totalCard: 0, totalPG: 0, totalNEFT: 0
    });

    res.status(200).json({
      success: true,
      data: reportRows,
      grandTotals,
      filters: { colid, programcode, academicyear, feeitem }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error generating student ledger wise report",
      error: error.message
    });
  }
};
