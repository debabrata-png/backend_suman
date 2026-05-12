// jobApplicationController.js
const jobapplicationformds = require("../Models/jobapplicationformds");
const jobinternalds = require("../Models/jobinternalds");
const SalarySettingds = require("../Models/salarysettingds");
const User = require("../Models/user");
const mongoose = require("mongoose");

// 1. Create new application only if none exists for this user+job+college
exports.createapplication = async (req, res) => {
  try {
    const { applicantemail, jobtitle, colid } = req.body;

    // Make sure we do not create duplicates for the same email+job+college
    const existing = await jobapplicationformds.findOne({
      applicantemail,
      jobtitle,
      colid
    });

    if (existing)
      return res.status(409).json({ message: "Application already exists" });

    const application = await jobapplicationformds.create(req.body);
    return res.status(201).json(application);
  } catch (err) {
  }
};

exports.getapplicationsgrouped = async (req, res) => {
  try {
    const { colid, jobid } = req.query;

    const applications = await jobapplicationformds.find({
      colid: parseInt(colid),
      jobid: jobid
    })

    res.json(applications);
  } catch (e) {
  }
};


exports.getapplicationbyid = async (req, res) => {
  try {
    const {id, colid} = req.query;
    const application = await jobapplicationformds.findOne({
      _id: id,
      colid: parseInt(colid)
    })
    return res.json(application);
  } catch (error) {
    
  }
}

// PATCH /api/admin/applications/:id/status
exports.updatestatus = async (req, res) => {
  try {
    const { id } = req.body;
    const { status } = req.body;
    const updated = await jobapplicationformds
      .findByIdAndUpdate(id, { status }, { new: true })
      .lean();
    res.json(updated);
  } catch (e) {
  }
};

exports.createinternaljob = async (req, res) => {
  try {
    const job = await jobinternalds.create(req.body);
    res.json(job);
  } catch (e) {
  }
};

exports.getinternaljobs = async (req, res) => {
  try {
    const { colid } = req.query;
    const filter = colid ? { colid: Number(colid) } : {};
    const jobs = await jobinternalds.find(filter).sort({ createdAt: -1 });
    res.json(jobs);
  } catch (e) {
  }
};

exports.getinternaljobbyid = async (req, res) => {
  try {
    const job = await jobinternalds.findById(req.query.id);
    if (!job) return res.status(404).json({ message: "Job not found" });
    res.json(job);
  } catch (e) {
  }
};

exports.updateinternaljob = async (req, res) => {
  try {
    const job = await jobinternalds.findByIdAndUpdate(req.query.id, req.body, { new: true });
    res.json(job);
  } catch (e) {
  }
};

exports.deleteinternaljob = async (req, res) => {
  try {
    const job = await jobinternalds.findByIdAndDelete(req.query.id);
    if (!job) return res.status(404).json({ message: "Job not found" });
    res.json({ message: "Job deleted" });
  } catch (e) {
  }
};

exports.hirecandidate = async (req, res) => {
  try {
    const { applicationId, salaryConfig, colid } = req.body;

    // 1. Update Application Status to 'Hired'
    const application = await jobapplicationformds.findById(applicationId);
    if (!application) return res.status(404).json({ success: false, message: "Application not found" });

    application.status = "Hired";
    await application.save();

    // 2. Create Salary Configuration
    // The salaryConfig should contain basic salary, HRA, etc.
    const newSalaryConfig = await SalarySettingds.create({
      ...salaryConfig,
      name: application.applicantname, // Store for easy reference
      user: application.applicantemail, // using email as user identifier
      empname: application.applicantname,
      empemail: application.applicantemail,
      colid: colid
    });

    // 3. Create User record with status 0
    // Check if user already exists
    const existingUser = await User.findOne({ email: application.applicantemail });
    let user;
    if (!existingUser) {
      user = await User.create({
        name: application.applicantname,
        email: application.applicantemail,
        phone: application.applicantphone,
        role: "Employee",
        colid: colid,
        status: 0,
        password: "TempPassword123", // User should change it later
        user: application.applicantemail, // setting 'user' field as email too if required by schema
        programcode: application.jobtitle // Using job title or some other identifier
      });
    } else {
      user = existingUser;
      user.status = 0; // Ensure status 0 if they already exist (e.g. from previous application)
      await user.save();
    }

    res.status(200).json({
      success: true,
      message: "Candidate hired successfully. User created and salary configured.",
      application,
      salaryConfig: newSalaryConfig,
      user
    });

  } catch (error) {
    console.error("Hire Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
