const ProgramCounselords = require('../Models/ProgramCounselords.js');

// Create program
exports.createprogramcounselords = async (req, res) => {
    try {
        req.body.colid = Number(req.body.colid);
        const program = await ProgramCounselords.create(req.body);
        res.status(201).json({ success: true, data: program });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get all programs
exports.getallprogramcounselords = async (req, res) => {
    try {
        const { colid, category, is_active, education_qualification } = req.query;

        let query = { colid: Number(colid) };

        if (category) query.category = category;
        if (is_active) query.is_active = is_active;
        if (education_qualification) query.education_qualification = education_qualification;

        const programs = await ProgramCounselords.find(query).sort({ category: 1, course_name: 1 });

        res.status(200).json({ success: true, data: programs, count: programs.length });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get program by ID
exports.getprogramcounselorbyidds = async (req, res) => {
    try {
        const { id } = req.params;
        const program = await ProgramCounselords.findById(id);
        if (!program) {
            return res.status(404).json({ success: false, message: 'Program not found' });
        }
        res.status(200).json({ success: true, data: program });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Update program
exports.updateprogramcounselords = async (req, res) => {
    try {
        const { id } = req.query;
        if (req.body.colid) {
            req.body.colid = Number(req.body.colid);
        }
        const program = await ProgramCounselords.findByIdAndUpdate(id, req.body, { new: true });
        if (!program) {
            return res.status(404).json({ success: false, message: 'Program not found' });
        }
        res.status(200).json({ success: true, data: program });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Delete program
exports.deleteprogramcounselords = async (req, res) => {
    try {
        const { id } = req.params;
        const program = await ProgramCounselords.findByIdAndDelete(id);
        if (!program) {
            return res.status(404).json({ success: false, message: 'Program not found' });
        }
        res.status(200).json({ success: true, message: 'Program deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
// Get distinct institutions
exports.getinstitutionsds = async (req, res) => {
    try {
        const { colid } = req.query;
        const institutions = await ProgramCounselords.distinct('institution', {
            colid: Number(colid),
            is_active: 'Yes'
        });
        const cleanInstitutions = institutions.filter(inst => inst);
        res.status(200).json({ success: true, data: cleanInstitutions.sort() });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get program types by institution
exports.getprogramtypesds = async (req, res) => {
    try {
        const { colid, institution } = req.query;
        const programTypes = await ProgramCounselords.distinct('program_type', {
            colid: Number(colid),
            institution: institution,
            is_active: 'Yes'
        });
        const cleanTypes = programTypes.filter(type => type);
        res.status(200).json({ success: true, data: cleanTypes.sort() });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get programs by institution and type
exports.getprogramsbyfiltersds = async (req, res) => {
    try {
        const { colid, institution, program_type } = req.query;
        let query = {
            colid: Number(colid),
            is_active: 'Yes'
        };
        if (institution) query.institution = institution;
        if (program_type) query.program_type = program_type;
        const programs = await ProgramCounselords.find(query).select('course_name _id').sort({ course_name: 1 });
        res.status(200).json({ success: true, data: programs });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
