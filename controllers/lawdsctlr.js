const lawuserds = require('../Models/lawuserds');
const lawformds = require('../Models/lawformds');
const laweditlogds = require('../Models/laweditlogds');

// ======================
// USER AUTHENTICATION CONTROLLERS
// ======================

// User Registration
exports.registeruser = async (req, res) => {
  try {
    const { email } = req.body;
    const existingUser = await lawuserds.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    const newUser = await lawuserds.create(req.body);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: newUser._id,
          fullname: newUser.fullname,
          email: newUser.email,
          phone: newUser.phone,
          colid: newUser.colid,
          role: newUser.role
        }
      }
    });
  } catch (error) {
    // res.status(500).json({
    //   success: false,
    //   message: 'Error registering user',
    //   error: error.message
    // });
  }
};

// User Login
exports.loginuser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await lawuserds.findOne({ email, password });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          fullname: user.fullname,
          email: user.email,
          phone: user.phone,
          colid: user.colid,
          role: user.role
        }
      }
    });
  } catch (error) {
    // res.status(500).json({
    //   success: false,
    //   message: 'Error during login',
    //   error: error.message
    // });
  }
};

// Get User Profile
exports.getuserprofile = async (req, res) => {
  try {
    const { userid } = req.query;
    const user = await lawuserds.findById(userid).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    // res.status(500).json({
    //   success: false,
    //   message: 'Error fetching user profile',
    //   error: error.message
    // });
  }
};

// Update User Profile
exports.updateuserprofile = async (req, res) => {
  try {
    const { userid, fullname, phone } = req.body;

    const updatedUser = await lawuserds.findByIdAndUpdate(
      userid,
      { fullname, phone },
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser
    });
  } catch (error) {
    // res.status(500).json({
    //   success: false,
    //   message: 'Error updating profile',
    //   error: error.message
    // });
  }
};

// Change Password
exports.changepassword = async (req, res) => {
  try {
    const { userid, oldpassword, newpassword } = req.body;

    const user = await lawuserds.findById(userid);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.password !== oldpassword) {
      return res.status(400).json({
        success: false,
        message: 'Old password is incorrect'
      });
    }

    user.password = newpassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    // res.status(500).json({
    //   success: false,
    //   message: 'Error changing password',
    //   error: error.message
    // });
  }
};

// ======================
// CASE MANAGEMENT CONTROLLERS
// ======================

// Create Case
exports.createcase = async (req, res) => {
  try {
    const caseData = req.body;
    const newCase = await lawformds.create(caseData);

    res.status(201).json({
      success: true,
      message: 'Case created successfully',
      data: newCase
    });
  } catch (error) {
    // res.status(500).json({
    //   success: false,
    //   message: 'Error creating case',
    //   error: error.message
    // });
  }
};

// Get All Cases (with access control using existing fields)
exports.getallcases = async (req, res) => {
  try {
    const { colid, useremail, userrole } = req.query;

    let query = { colid: parseInt(colid) };

    // If user is Jr Lawyer, filter by jrlawyer array email
    if (userrole === 'Jr. Lawyer') {
      query['jrlawyer.email'] = useremail;
    }
    // If user is Law Clerk, filter by lawclerkemail
    else if (userrole === 'Law Clerk') {
      query.lawclerkemail = useremail;
    }
    // Sr. Lawyer can see all cases (no additional filter)

    const cases = await lawformds.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: cases
    });
  } catch (error) {
    // res.status(500).json({
    //   success: false,
    //   message: 'Error fetching cases',
    //   error: error.message
    // });
  }
};

// Get Case By ID (with access control using existing fields)
exports.getcasebyid = async (req, res) => {
  try {
    const { id, useremail, userrole } = req.query;

    const caseData = await lawformds.findById(id);

    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: 'Case not found'
      });
    }

    // Check access permissions
    if (userrole === 'Jr. Lawyer') {
      const hasAccess = caseData.jrlawyer.some(lawyer => lawyer.email === useremail);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this case'
        });
      }
    }

    if (userrole === 'Law Clerk' && caseData.lawclerkemail !== useremail) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this case'
      });
    }

    res.status(200).json({
      success: true,
      data: caseData
    });
  } catch (error) {
    // res.status(500).json({
    //   success: false,
    //   message: 'Error fetching case',
    //   error: error.message
    // });
  }
};

// Update Case (with edit logging)
exports.updatecase = async (req, res) => {
  try {
    const { id, editedby, editedbyemail, editeduserid, ...updateData } = req.body;

    // Get old data for logging
    const oldCase = await lawformds.findById(id);

    if (!oldCase) {
      return res.status(404).json({
        success: false,
        message: 'Case not found'
      });
    }

    // Update the case
    const updatedCase = await lawformds.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    // Calculate changes
    let changes = [];
    const oldData = oldCase.toObject();
    const newData = updatedCase.toObject();

    // Helper to format date
    const formatDate = (date) => {
      if (!date) return '';
      return new Date(date).toLocaleDateString('en-GB');
    };

    // Check specific fields for changes
    if (formatDate(oldData.nextdateforhearing) !== formatDate(newData.nextdateforhearing)) {
      changes.push(`Next Hearing Date changed from '${formatDate(oldData.nextdateforhearing)}' to '${formatDate(newData.nextdateforhearing)}'`);
    }

    if (oldData.nextdateforhearingtime !== newData.nextdateforhearingtime) {
      changes.push(`Hearing Time changed from '${oldData.nextdateforhearingtime || ''}' to '${newData.nextdateforhearingtime || ''}'`);
    }

    if (oldData.datefor !== newData.datefor) {
      changes.push(`Date For changed from '${oldData.datefor || ''}' to '${newData.datefor || ''}'`);
    }

    if (oldData.courtname !== newData.courtname) {
      changes.push(`Court changed from '${oldData.courtname || ''}' to '${newData.courtname || ''}'`);
    }

    if (oldData.caseregtype !== newData.caseregtype) {
      changes.push(`Case Type changed from '${oldData.caseregtype || ''}' to '${newData.caseregtype || ''}'`);
    }

    if (oldData.partyname !== newData.partyname) {
      changes.push(`Party Name changed from '${oldData.partyname || ''}' to '${newData.partyname || ''}'`);
    }

    if (oldData.lawclerkname !== newData.lawclerkname) {
      changes.push(`Law Clerk changed from '${oldData.lawclerkname || ''}' to '${newData.lawclerkname || ''}'`);
    }

    if (oldData.opponentlawyername !== newData.opponentlawyername) {
      changes.push(`Opponent Lawyer changed from '${oldData.opponentlawyername || ''}' to '${newData.opponentlawyername || ''}'`);
    }

    // Create edit log entry
    await laweditlogds.create({
      caseid: id,
      caseno: updatedCase.caseno,
      editedby,
      editedbyemail,
      editeduserid,
      edittype: 'update',
      changedsummary: changes.length > 0 ? changes.join(', ') : 'Case details updated',
      nextdateforhearing: updatedCase.nextdateforhearing,
      nextdateforhearingtime: updatedCase.nextdateforhearingtime,
      datefor: updatedCase.datefor,
      olddatajson: oldCase.toObject(),
      newdatajson: updatedCase.toObject(),
      colid: updatedCase.colid
    });

    res.status(200).json({
      success: true,
      message: 'Case updated successfully',
      data: updatedCase
    });
  } catch (error) {
    // res.status(500).json({
    //   success: false,
    //   message: 'Error updating case',
    //   error: error.message
    // });
  }
};

// Delete Case (with edit logging)
exports.deletecase = async (req, res) => {
  try {
    const { id, editedby, editedbyemail, editeduserid } = req.query;

    // Get case data before deletion for logging
    const caseData = await lawformds.findById(id);

    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: 'Case not found'
      });
    }

    // Delete the case
    await lawformds.findByIdAndDelete(id);

    // Create edit log entry
    await laweditlogds.create({
      caseid: id,
      caseno: caseData.caseno,
      editedby,
      editedbyemail,
      editeduserid,
      edittype: 'delete',
      changedsummary: 'Case deleted',
      olddatajson: caseData.toObject(),
      newdatajson: null,
      colid: caseData.colid
    });

    res.status(200).json({
      success: true,
      message: 'Case deleted successfully'
    });
  } catch (error) {
    // res.status(500).json({
    //   success: false,
    //   message: 'Error deleting case',
    //   error: error.message
    // });
  }
};

// Get Dashboard Statistics
exports.getdashboardstats = async (req, res) => {
  try {
    const { colid, useremail, userrole } = req.query;

    let query = { colid: parseInt(colid) };

    // Apply role-based access control using existing fields
    if (userrole === 'Jr. Lawyer') {
      query['jrlawyer.email'] = useremail;
    } else if (userrole === 'Law Clerk') {
      query.lawclerkemail = useremail;
    }

    // Total cases count
    const totalCases = await lawformds.countDocuments(query);

    // Upcoming hearings (next 30 days)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

    const upcomingHearings = await lawformds.countDocuments({
      ...query,
      nextdateforhearing: {
        $gte: today,
        $lte: thirtyDaysLater
      }
    });

    // Cases by type
    const casesByType = await lawformds.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$caseregtype',
          count: { $sum: 1 }
        }
      }
    ]);

    // Cases by court
    const casesByCourt = await lawformds.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$courtname',
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalCases,
        upcomingHearings,
        casesByType,
        casesByCourt
      }
    });
  } catch (error) {
    // res.status(500).json({
    //   success: false,
    //   message: 'Error fetching dashboard statistics',
    //   error: error.message
    // });
  }
};

// Search Cases with Filters (using existing fields for access control)
exports.searchcases = async (req, res) => {
  try {
    const {
      colid,
      useremail,
      userrole,
      caseno,
      partyname,
      courtname,
      caseregtype,
      rackno,
      startdate,
      enddate,
      plaintiffname,
      defendantname
    } = req.query;

    // Base query with colid
    let query = { colid: parseInt(colid) };

    // Apply role-based access control using existing fields
    if (userrole === 'Jr. Lawyer') {
      query['jrlawyer.email'] = useremail;
    } else if (userrole === 'Law Clerk') {
      query.lawclerkemail = useremail;
    }

    // Add search filters
    if (caseno) {
      query.caseno = { $regex: caseno, $options: 'i' };
    }

    if (partyname) {
      query.partyname = { $regex: partyname, $options: 'i' };
    }

    if (courtname) {
      query.courtname = { $regex: courtname, $options: 'i' };
    }

    if (caseregtype) {
      query.caseregtype = { $regex: caseregtype, $options: 'i' };
    }

    if (rackno) {
      query.rackno = { $regex: rackno, $options: 'i' };
    }

    if (plaintiffname) {
      query.plaintiffname = { $regex: plaintiffname, $options: 'i' };
    }

    if (defendantname) {
      query.defendantname = { $regex: defendantname, $options: 'i' };
    }

    // Date range filter for next hearing date
    if (startdate || enddate) {
      query.nextdateforhearing = {};
      if (startdate) {
        query.nextdateforhearing.$gte = new Date(startdate);
      }
      if (enddate) {
        query.nextdateforhearing.$lte = new Date(enddate);
      }
    }

    const cases = await lawformds.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: cases,
      count: cases.length
    });
  } catch (error) {
    // res.status(500).json({
    //   success: false,
    //   message: 'Error searching cases',
    //   error: error.message
    // });
  }
};

// Get Upcoming Cases (Next Hearings) - using existing fields for access control
exports.getupcomingcases = async (req, res) => {
  try {
    const { colid, useremail, userrole, days } = req.query;

    // Calculate date range (default 30 days if not specified)
    const daysAhead = days ? parseInt(days) : 30;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    futureDate.setHours(23, 59, 59, 999);

    // Base query
    let query = {
      colid: parseInt(colid),
      nextdateforhearing: {
        $gte: today,
        $lte: futureDate
      }
    };

    // Apply role-based access control using existing fields
    if (userrole === 'Jr. Lawyer') {
      query['jrlawyer.email'] = useremail;
    } else if (userrole === 'Law Clerk') {
      query.lawclerkemail = useremail;
    }

    const upcomingCases = await lawformds
      .find(query)
      .sort({ nextdateforhearing: 1 });

    res.status(200).json({
      success: true,
      data: upcomingCases,
      count: upcomingCases.length
    });
  } catch (error) {
    // res.status(500).json({
    //   success: false,
    //   message: 'Error fetching upcoming cases',
    //   error: error.message
    // });
  }
};
