const Ledgerstud = require("../Models/ledgerstud.js");

exports.studentLedgerReportds = async (req, res) => {
  try {
    const { regno, colid, semester } = req.query;

    // Validation - only regno and colid are required
    if (!regno || !colid) {
      return res.status(400).json({
        success: false,
        message: "regno and colid are required",
      });
    }

    // Build match filter - semester is optional
    const matchFilter = {
      regno: String(regno),
      colid: Number(colid),
    };

    // Add semester only if provided
    if (semester) {
      matchFilter.semester = String(semester);
    }

    // Aggregation Pipeline for efficient data retrieval
    const ledgerData = await Ledgerstud.aggregate([
      // Stage 1: Match documents for the specific student and college (semester optional)
      {
        $match: matchFilter,
      },

      // Stage 2: Add computed fields for categorization
      {
        $addFields: {
          amountType: {
            $cond: [{ $gte: ["$amount", 0] }, "payable", "paid"],
          },
          absoluteAmount: {
            $abs: "$amount",
          },
        },
      },

      // Stage 3: Sort by date or entry order
      {
        $sort: {
          createdAt: 1,
        },
      },

      // Stage 4: Group and calculate totals
      {
        $facet: {
          transactions: [
            {
              $project: {
                _id: 1,
                feeitem: 1,
                feecategory: 1,
                amount: 1,
                amountType: 1,
                paymode: 1,
                paydetails: 1,
                comments: 1,
                academicyear: 1,
                installment: 1,
                semester: 1,
                createdAt: 1,
              },
            },
          ],
          summary: [
            {
              $group: {
                _id: null,
                totalPayable: {
                  $sum: {
                    $cond: [
                      { $gt: ["$amount", 0] },
                      "$amount",
                      0,
                    ],
                  },
                },
                totalPaid: {
                  $sum: {
                    $cond: [
                      { $lt: ["$amount", 0] },
                      {
                        $abs: "$amount",
                      },
                      0,
                    ],
                  },
                },
                transactionCount: { $sum: 1 },
              },
            },
          ],
        },
      },

      // Stage 5: Calculate balance
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
                balance: {
                  $subtract: ["$$sum.totalPayable", "$$sum.totalPaid"],
                },
                transactionCount: "$$sum.transactionCount",
              },
            },
          },
        },
      },
    ]);

    if (!ledgerData || ledgerData.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No ledger data found for this student",
      });
    }

    const result = ledgerData[0];
    const summaryData = result.summary[0] || {
      totalPayable: 0,
      totalPaid: 0,
      balance: 0,
      transactionCount: 0,
    };

    // Get student details for report header
    const studentDetails = await Ledgerstud.findOne(matchFilter)
      .select("name student regno")
      .limit(1);

    res.status(200).json({
      success: true,
      data: {
        student: {
          name: studentDetails?.student || "N/A",
          regno: regno,
          colid: colid,
          semester: semester || "All Semesters",
        },
        transactions: result.transactions,
        summary: summaryData,
      },
    });
  } catch (error) {
    // res.status(500).json({
    //   success: false,
    //   message: "Error generating student ledger report",
    //   error: error.message,
    // });
  }
};
