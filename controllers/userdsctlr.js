const User = require('../Models/user');

// Get filter options for student search
exports.getstudentfilteroptions = async (req, res) => {
  try {
    const { colid } = req.query;

    // console.log('📊 Filter Options Request - colid:', colid);

    if (!colid) {
      return res.status(400).json({
        status: 'Failed',
        message: 'colid is required'
      });
    }

    const colidNum = parseInt(colid);

    // Fetch distinct values for each filter field
    const programcodes = await User.distinct('programcode', { 
      colid: colidNum, 
      role: 'Student',
      status: 1
    });

    const semesters = await User.distinct('semester', { 
      colid: colidNum, 
      role: 'Student',
      status: 1
    });

    const sections = await User.distinct('section', { 
      colid: colidNum, 
      role: 'Student',
      status: 1
    });

    const academicyears = await User.distinct('admissionyear', { 
      colid: colidNum, 
      role: 'Student',
      status: 1
    });

    // console.log('✅ Filter Options Found:', {
    //   programcodes: programcodes.length,
    //   semesters: semesters.length,
    //   sections: sections.length,
    //   academicyears: academicyears.length
    // });

    res.status(200).json({
      status: 'Success',
      data: {
        programcodes: programcodes.filter(Boolean).sort(),
        semesters: semesters.filter(Boolean).sort(),
        sections: sections.filter(Boolean).sort(),
        academicyears: academicyears.filter(Boolean).sort()
      }
    });
  } catch (error) {
    // console.error('❌ Error in getstudentfilteroptions:', error);
    // res.status(500).json({
    //   status: 'Failed',
    //   message: 'Error fetching filter options',
    //   error: error.message
    // });
  }
};

// Get filtered students
exports.getfilteredstudentsds = async (req, res) => {
  try {
    const { colid, programcode, semester, section, admissionyear, page = 1, limit = 20, search = '' } = req.query;

    // console.log('📋 Student List Request:', {
    //   colid,
    //   programcode,
    //   semester,
    //   section,
    //   admissionyear,
    //   page,
    //   limit,
    //   search
    // });

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
    if (programcode && programcode !== '') {
      filter.programcode = programcode;
    }
    if (semester && semester !== '') {
      filter.semester = semester;
    }
    if (section && section !== '') {
      filter.section = section;
    }
    if (admissionyear && admissionyear !== '') {
      filter.admissionyear = admissionyear;
    }

    // Add search functionality
    if (search && search.trim() !== '') {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { regno: { $regex: search, $options: 'i' } },
        { rollno: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

   // console.log('🔍 MongoDB Filter:', JSON.stringify(filter, null, 2));

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Exclude password, comments, colid, lastlogin
    const students = await User.find(filter)
      .sort({ _id: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-password -comments -colid -lastlogin');

    const total = await User.countDocuments(filter);

   // console.log(`✅ Found ${total} students, returning page ${page} (${students.length} records)`);

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
    // console.error('❌ Error in getfilteredstudentsds:', error);
    // res.status(500).json({
    //   status: 'Failed',
    //   message: 'Error fetching students',
    //   error: error.message
    // });
  }
};
