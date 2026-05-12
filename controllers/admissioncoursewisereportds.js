const Crmh1 = require('../Models/crmh1');

exports.admissioncoursewisereportds = async (req, res) => {
    try {
        const { colid } = req.query;

        if (!colid) {
            return res.status(400).json({ success: false, message: 'colid is required' });
        }

        const report = await Crmh1.aggregate([
            {
                $match: {
                    colid: Number(colid),
                    pipeline_stage: {
                        $in: [
                            'Admitted',
                            'Admission Done',
                            'Fees Paid',
                            'Seat Booked',
                            'Seal Booked'
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: {
                        institution: '$institution',
                        program: '$program'
                    },
                    admittedCount: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    institution: '$_id.institution',
                    program: '$_id.program',
                    admittedCount: 1
                }
            },
            {
                $sort: { institution: 1, program: 1 }
            }
        ]);

        res.status(200).json({
            success: true,
            data: report
        });

    } catch (error) {
        console.error('Error in admissioncoursewisereportds:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
