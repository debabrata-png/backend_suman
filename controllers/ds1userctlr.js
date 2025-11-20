const User = require("../Models/user");

// ==========================================
// ADMIN FUNCTIONS
// ==========================================

// Create Single User (Admin)
exports.ds1createuser = async (req, res) => {
  try {
    const userData = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      return res.status(400).json({ message: "User with this email already exists" });
    }

    const user = await User.create(userData);
    
    res.status(201).json({ 
      message: "User created successfully", 
      data: user 
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Error creating user", 
      error: error.message 
    });
  }
};

// Bulk Create Users (Admin)
exports.ds1bulkcreateuser = async (req, res) => {
  try {
    const { users } = req.body; // Array of user objects
    
    if (!users || !Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ message: "Users array is required" });
    }

    // Validate and filter out duplicates
    const emails = users.map(u => u.email);
    const existingUsers = await User.find({ email: { $in: emails } });
    const existingEmails = existingUsers.map(u => u.email);
    
    const newUsers = users.filter(u => !existingEmails.includes(u.email));
    
    if (newUsers.length === 0) {
      return res.status(400).json({ 
        message: "All users already exist",
        duplicates: existingEmails 
      });
    }

    const createdUsers = await User.insertMany(newUsers, { ordered: false });
    
    res.status(201).json({ 
      message: `${createdUsers.length} users created successfully`,
      created: createdUsers.length,
      duplicates: existingEmails.length,
      data: createdUsers 
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Error creating users", 
      error: error.message 
    });
  }
};

// Get All Users with Search and Filters (Admin)
exports.ds1getalluser = async (req, res) => {
  try {
    const { 
      colid, 
      search, 
      role, 
      department, 
      semester, 
      section,
      programcode,
      status,
      page = 1, 
      limit = 50 
    } = req.query;

    // Build query
    const query = {};
    
    if (colid) query.colid = parseInt(colid);
    if (role) query.role = role;
    if (department) query.department = department;
    if (semester) query.semester = semester;
    if (section) query.section = section;
    if (programcode) query.programcode = programcode;
    if (status) query.status = parseInt(status);

    // Search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { regno: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.status(200).json({ 
      data: users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Error fetching users", 
      error: error.message 
    });
  }
};

// Get Single User by ID (Admin)
exports.ds1getuserbyid = async (req, res) => {
  try {
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ data: user });
  } catch (error) {
    res.status(500).json({ 
      message: "Error fetching user", 
      error: error.message 
    });
  }
};

// Update User (Admin - Full Access)
exports.ds1updateuser = async (req, res) => {
  try {
    const { id } = req.query;
    const updateData = req.body;

    if (!id) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const user = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ 
      message: "User updated successfully", 
      data: user 
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Error updating user", 
      error: error.message 
    });
  }
};

// Delete User (Admin)
exports.ds1deleteuser = async (req, res) => {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ 
      message: "User deleted successfully", 
      data: user 
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Error deleting user", 
      error: error.message 
    });
  }
};

// Bulk Delete Users (Admin)
exports.ds1bulkdeleteuser = async (req, res) => {
  try {
    const { ids } = req.query; // Comma-separated string of IDs

    if (!ids) {
      return res.status(400).json({ message: "User IDs are required" });
    }

    // Convert comma-separated string to array
    const idArray = ids.split(',').map(id => id.trim());

    const result = await User.deleteMany({ _id: { $in: idArray } });

    res.status(200).json({ 
      message: `${result.deletedCount} users deleted successfully`,
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Error deleting users", 
      error: error.message 
    });
  }
};

// ==========================================
// STUDENT FUNCTIONS
// ==========================================

// Get Current Student Profile
exports.ds1getstudentprofile = async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ data: user });
  } catch (error) {
    res.status(500).json({ 
      message: "Error fetching profile", 
      error: error.message 
    });
  }
};

// Update Student Profile (Limited Fields) - WITH LOGGING
exports.ds1updatestudentprofile = async (req, res) => {
  try {
    const { email } = req.query;
    const updateData = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // ✅ GET CURRENT USER DATA FOR COMPARISON
    const currentUser = await User.findOne({ email });
    
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Define allowed fields for student update
    const allowedFields = [
      // Personal Info
      'phone', 'gender', 'photo', 'category', 'address', 'quota', 'dob',
      // Family Info
      'fathername', 'mothername',
      // Academic Info
      'eligibilityname', 'degree', 'minorsub', 'vocationalsub',
      'mdcsub', 'othersub',
      // Merit/Scholarship
      'merit', 'obtain', 'bonus', 'weightage', 'ncctype',
      'isdisabled', 'scholarship'
    ];

    // ✅ TRACK CHANGES FOR LOGGING
    const changes = [];
    const filteredData = {};

    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        const oldValue = currentUser[key] ? String(currentUser[key]) : "";
        const newValue = updateData[key] ? String(updateData[key]) : "";
        
        // ✅ ONLY LOG IF VALUE ACTUALLY CHANGED
        if (oldValue !== newValue) {
          changes.push({
            fieldName: key,
            oldValue: oldValue,
            newValue: newValue
          });
          
          filteredData[key] = updateData[key];
        }
      }
    });

    if (Object.keys(filteredData).length === 0) {
      return res.status(400).json({
        message: "No valid fields to update",
        allowedFields
      });
    }

    // ✅ UPDATE USER
    const user = await User.findOneAndUpdate(
      { email },
      filteredData,
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ CREATE EDIT LOG (THIS WAS MISSING!)
    if (changes.length > 0) {
      const Profileeditlogds = require("../Models/profileeditlogds");
      const { getFieldCategory, getFieldLabel } = require("./ds1profileeditlogctlr");
      
      // Enrich changes with category and label
      const enrichedChanges = changes.map(change => ({
        ...change,
        category: getFieldCategory(change.fieldName),
        fieldLabel: getFieldLabel(change.fieldName)
      }));
      
      // ✅ SAVE LOG TO DATABASE
      await Profileeditlogds.create({
        colid: user.colid,
        name: user.name,
        regno: user.regno,
        changes: enrichedChanges,
        changeType: "Update",
        totalFieldsChanged: changes.length
      });
    }

    res.status(200).json({
      message: "Profile updated successfully",
      data: user,
      changesLogged: changes.length  // ✅ RETURN LOG COUNT
    });
  } catch (error) {
    console.error("Error in ds1updatestudentprofile:", error);
    res.status(500).json({
      message: "Error updating profile",
      error: error.message
    });
  }
};


// ==========================================
// UTILITY FUNCTIONS
// ==========================================

// Get User Statistics (Admin)
exports.ds1getuserstats = async (req, res) => {
  try {
    const { colid } = req.query;

    const query = colid ? { colid: parseInt(colid) } : {};

    const stats = await User.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          byRole: {
            $push: {
              role: "$role",
              count: 1
            }
          },
          byDepartment: {
            $push: {
              department: "$department",
              count: 1
            }
          },
          activeUsers: {
            $sum: { $cond: [{ $eq: ["$status", 1] }, 1, 0] }
          },
          inactiveUsers: {
            $sum: { $cond: [{ $eq: ["$status", 0] }, 1, 0] }
          }
        }
      }
    ]);

    res.status(200).json({ data: stats[0] || {} });
  } catch (error) {
    res.status(500).json({ 
      message: "Error fetching statistics", 
      error: error.message 
    });
  }
};

// Get Unique Values for Filters (Admin)
exports.ds1getfilteroptions = async (req, res) => {
  try {
    const { colid } = req.query;
    const query = colid ? { colid: parseInt(colid) } : {};

    const departments = await User.distinct('department', query);
    const roles = await User.distinct('role', query);
    const semesters = await User.distinct('semester', query);
    const sections = await User.distinct('section', query);
    const programcodes = await User.distinct('programcode', query);

    res.status(200).json({
      departments: departments.filter(d => d),
      roles: roles.filter(r => r),
      semesters: semesters.filter(s => s),
      sections: sections.filter(s => s),
      programcodes: programcodes.filter(p => p)
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Error fetching filter options", 
      error: error.message 
    });
  }
};
