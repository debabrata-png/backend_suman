const programmasterds = require('../Models/programmasterds.js');

// Create program
exports.createprogrammasterds = async (req, res) => {
    try {
        req.body.colid = Number(req.body.colid);
        const program = await programmasterds.create(req.body);
        res.status(201).json({ success: true, data: program });
    } catch (err) {
        // console.error('Error in createprogrammasterds:', err);
        // res.status(500).json({ success: false, message: err.message });
    }
};

// Get all programs
exports.getallprogramsds = async (req, res) => {
    try {
        const { colid, category, is_active } = req.query;
        
        let query = { colid: Number(colid) };
        
        if (category) query.category = category;
        if (is_active) query.is_active = is_active;
        
        const programs = await programmasterds.find(query).sort({ category: 1, course_name: 1 });
        
        res.status(200).json({ success: true, data: programs, count: programs.length });
    } catch (err) {
        // console.error('Error in getallprogramsds:', err);
        // res.status(500).json({ success: false, message: err.message });
    }
};

// Get program by ID
exports.getprogrambyidds = async (req, res) => {
    try {
        const { id } = req.params;
        
        const program = await programmasterds.findById(id);
        
        if (!program) {
            return res.status(404).json({ success: false, message: 'Program not found' });
        }
        
        res.status(200).json({ success: true, data: program });
    } catch (err) {
        // console.error('Error in getprogrambyidds:', err);
        // res.status(500).json({ success: false, message: err.message });
    }
};

// Get programs by category
exports.getprogramsbycategoryds = async (req, res) => {
    try {
        const { category } = req.params;
        const { colid } = req.query;
        
        const programs = await programmasterds.find({
            colid: Number(colid),
            category,
            is_active: 'Yes'
        }).sort({ course_name: 1 });
        
        res.status(200).json({ success: true, data: programs, count: programs.length });
    } catch (err) {
        // console.error('Error in getprogramsbycategoryds:', err);
        // res.status(500).json({ success: false, message: err.message });
    }
};

// Update program
exports.updateprogrammasterds = async (req, res) => {
    try {
        const { id } = req.query;  // Changed from req.params
        
        if (req.body.colid) {
            req.body.colid = Number(req.body.colid);
        }
        
        const program = await programmasterds.findByIdAndUpdate(id, req.body, { new: true });
        
        if (!program) {
            return res.status(404).json({ success: false, message: 'Program not found' });
        }
        
        res.status(200).json({ success: true, data: program });
    } catch (err) {
        // console.error('Error in updateprogrammasterds:', err);
        // res.status(500).json({ success: false, message: err.message });
    }
};

// Delete program
exports.deleteprogrammasterds = async (req, res) => {
    try {
        const { id } = req.params;
        
        const program = await programmasterds.findByIdAndDelete(id);
        
        if (!program) {
            return res.status(404).json({ success: false, message: 'Program not found' });
        }
        
        res.status(200).json({ success: true, message: 'Program deleted successfully' });
    } catch (err) {
        // console.error('Error in deleteprogrammasterds:', err);
        // res.status(500).json({ success: false, message: err.message });
    }
};

// Get distinct institutions
exports.getinstitutionsds = async (req, res) => {
    try {
        const { colid } = req.query;
        // Fetch distinct 'institution' where colid matches and is_active is 'Yes'
        const institutions = await programmasterds.distinct('institution', {
            colid: Number(colid),
            is_active: 'Yes'
        });
        
        const cleanInstitutions = institutions.filter(inst => inst);
        
        res.status(200).json({ success: true, data: cleanInstitutions.sort() });
    } catch (err) {
        // res.status(500).json({ success: false, message: err.message });
    }
};

// Get program types by institution
exports.getprogramtypesds = async (req, res) => {
    try {
        const { colid, institution } = req.query;
        
        const programTypes = await programmasterds.distinct('program_type', {
            colid: Number(colid),
            institution: institution,
            is_active: 'Yes'
        });
        
        const cleanTypes = programTypes.filter(type => type);
        
        res.status(200).json({ success: true, data: cleanTypes.sort() });
    } catch (err) {
        // res.status(500).json({ success: false, message: err.message });
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
        
        const programs = await programmasterds.find(query).select('course_name _id').sort({ course_name: 1 });
        
        res.status(200).json({ success: true, data: programs });
    } catch (err) {
        // res.status(500).json({ success: false, message: err.message });
    }
};

