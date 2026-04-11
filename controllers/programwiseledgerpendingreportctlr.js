const Ledgerstud = require("../Models/ledgerstud");
const Institution = require("../Models/institutions");

// 1. Get Filters (Distinct ProgramCode, AcademicYear, Semester)
exports.getProgramWisePendingFilters = async (req, res) => {
  try {
    const { colid } = req.query;
    if (!colid) {
      return res.status(400).json({
        success: false,
        message: "colid is required",
      });
    }

    const query = { colid: Number(colid) };

    const programcodes = await Ledgerstud.distinct("programcode", query);
    const academicyears = await Ledgerstud.distinct("academicyear", query);
    const semesters = await Ledgerstud.distinct("semester", query);

    return res.status(200).json({
      success: true,
      data: {
        programcodes: programcodes.filter((p) => p).sort(),
        academicyears: academicyears.filter((y) => y).sort().reverse(),
        semesters: semesters.filter((s) => s).sort(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching filters",
      error: error.message,
    });
  }
};

// 2. Get Program-wise Pending Report (Detailed Breakup)
exports.getProgramWisePendingReport = async (req, res) => {
  try {
    const { colid, programcode, academicyear, semester } = req.query;

    if (!colid || !programcode || !academicyear) {
      return res.status(400).json({
        success: false,
        message: "colid, programcode, and academicyear are required",
      });
    }

    const filter = {
      colid: Number(colid),
      programcode: programcode,
      academicyear: academicyear,
      balance: { $gt: 0 },
    };

    if (semester && semester !== "All") {
      filter.semester = semester;
    }

    // Fetch all pending items with detailed breakup
    const pendingItems = await Ledgerstud.find(filter).sort({ name: 1, classdate: 1 });

    // Fetch institution info for branding
    const institution = await Institution.findOne({ colid: Number(colid) });

    return res.status(200).json({
      success: true,
      data: {
        pendingItems,
        institution: {
          name: institution ? institution.institutionname : "",
          logo: institution ? institution.logo : "",
          address: institution ? institution.address : "",
          phone: institution ? institution.phone : "",
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching program-wise pending report",
      error: error.message,
    });
  }
};
