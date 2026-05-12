const User = require("../Models/user");
const Ledgerstud = require("../Models/ledgerstud");
const Institution = require("../Models/institutions");

// ─────────────────────────────────────────────────────────────────────────────
// Student-wise Pending Fee Report
// GET /api/v2/studentwiseledgerpendingreport
// Required : colid, regno
// Optional : academicyear
// Returns  : student details, pending fee items, institution logo
// ─────────────────────────────────────────────────────────────────────────────
exports.getStudentWisePendingReport = async (req, res) => {
  try {
    const { colid, regno, academicyear } = req.query;

    if (!colid || !regno) {
      return res.status(400).json({
        success: false,
        message: "colid and regno are required",
      });
    }

    // 1. Fetch student details
    const student = await User.findOne({ regno, colid: Number(colid) });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // 2. Fetch pending items
    // Logic: balance > 0 AND classdate <= today
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today

    const filter = {
      regno,
      colid: Number(colid),
      balance: { $gt: 0 },
    };

    if (academicyear) {
      filter.academicyear = academicyear;
    }

    const pendingItems = await Ledgerstud.find(filter).sort({ classdate: 1 });

    // 3. Fetch institution logo
    const institution = await Institution.findOne({ colid: Number(colid) });

    return res.status(200).json({
      success: true,
      data: {
        student,
        pendingItems,
        institution: {
          name: institution ? institution.institutionname : "",
          logo: institution ? institution.logo : "",
          address: institution ? institution.address : "",
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching student-wise pending report",
      error: error.message,
    });
  }
};
