const User = require('../Models/user');

// Get filter options for student search
exports.getstudentfilteroptions = async (req, res) => {
  try {
    const { colid } = req.query;

    if (!colid) {
      return res.status(400).json({
        status: 'Failed',
        message: 'colid is required'
      });
    }

    const colidNum = parseInt(colid);

    // Fetch distinct values for each filter field
    const [programcodes, semesters, sections, academicyears, categories, departments] = await Promise.all([
      User.distinct('programcode', { colid: colidNum, role: 'Student', status: 1 }),
      User.distinct('semester', { colid: colidNum, role: 'Student', status: 1 }),
      User.distinct('section', { colid: colidNum, role: 'Student', status: 1 }),
      User.distinct('admissionyear', { colid: colidNum, role: 'Student', status: 1 }),
      User.distinct('category', { colid: colidNum, role: 'Student', status: 1 }),
      User.distinct('department', { colid: colidNum, role: 'Student', status: 1 })
    ]);

    res.status(200).json({
      status: 'Success',
      data: {
        programcodes: programcodes.filter(Boolean).sort(),
        semesters: semesters.filter(Boolean).sort(),
        sections: sections.filter(Boolean).sort(),
        academicyears: academicyears.filter(Boolean).sort(),
        categories: categories.filter(Boolean).sort(),
        departments: departments.filter(Boolean).sort()
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'Failed',
      message: 'Error fetching filter options',
      error: error.message
    });
  }
};

// Get filtered students
exports.getfilteredstudentsds = async (req, res) => {
  try {
    const { 
      colid, programcode, semester, section, admissionyear, category, department,
      page = 1, limit = 20, search = '' 
    } = req.query;

    if (!colid) {
      return res.status(400).json({
        status: 'Failed',
        message: 'colid is required'
      });
    }

    const colidNum = parseInt(colid);

    // Build filter query
    const filter = {
      colid: colidNum,
      role: 'Student',
      status: 1
    };

    // Add optional filters only if they have values
    if (programcode && programcode !== '') filter.programcode = programcode;
    if (semester && semester !== '') filter.semester = semester;
    if (section && section !== '') filter.section = section;
    if (admissionyear && admissionyear !== '') filter.admissionyear = admissionyear;
    if (category && category !== '') filter.category = category;
    if (department && department !== '') filter.department = department;

    // Add search functionality
    if (search && search.trim() !== '') {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { regno: { $regex: search, $options: 'i' } },
        { rollno: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Exclude password, comments, lastlogin
    const students = await User.find(filter)
      .sort({ _id: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-password -comments -lastlogin');

    const total = await User.countDocuments(filter);

    res.status(200).json({
      status: 'Success',
      data: students,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'Failed',
      message: 'Error fetching students',
      error: error.message
    });
  }
};

exports.getfilterednonstudentsds = async (req, res) => {
  try {
    const { 
      colid, department, role,
      page = 1, limit = 20, search = '' 
    } = req.query;

    if (!colid) {
      return res.status(400).json({
        status: 'Failed',
        message: 'colid is required'
      });
    }

    const colidNum = parseInt(colid);

    // Build filter query: Role NOT EQUAL to Student
    const filter = {
      colid: colidNum,
      role: { $ne: 'Student' },
      status: 1
    };

    if (department && department !== '') filter.department = department;
    if (role && role !== '') filter.role = role;

    // Add search functionality
    if (search && search.trim() !== '') {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { regno: { $regex: search, $options: 'i' } },
        { rollno: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const users = await User.find(filter)
      .sort({ _id: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-password -comments -lastlogin');

    const total = await User.countDocuments(filter);

    res.status(200).json({
      status: 'Success',
      data: users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'Failed',
      message: 'Error fetching staff',
      error: error.message
    });
  }
};

