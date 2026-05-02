const Institution = require('../Models/institutions');

exports.checkInstitutionsds = async (req, res) => {
    try {
        const colid = req.params.colid || req.query.colid;

        if (!colid) {
            return res.status(400).json({
                status: 'fail',
                message: 'Admin ColID is required'
            });
        }

        const numericColid = Number(colid);
        const exactInstitutions = await Institution.find({ colid: numericColid });
        const adminInstitutions = await Institution.find({ admincolid: numericColid, colid: { $ne: numericColid } });
        const institutions = [...exactInstitutions, ...adminInstitutions];

        res.status(200).json({
            status: 'success',
            results: institutions.length,
            data: {
                institutions
            }
        });
    } catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err.message
        });
    }
};
