const Crmh1 = require('../Models/crmh1');

exports.universityadmissionreportds = async (req, res) => {
    try {
        const { colid } = req.query;

        if (!colid) {
            return res.status(400).json({
                success: false,
                message: 'colid is required'
            });
        }

        // Pipeline stages
        // 1. Match colid and Admitted status
        // 2. Group by program_type and count
        const aggregationPipeline = [
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
                    _id: '$program_type', // Group by Program Type (UG, PG, etc.)
                    count: { $sum: 1 }
                }
            }
        ];

        const result = await Crmh1.aggregate(aggregationPipeline);

        // Format the result into a key-value map for easier frontend consumption
        // e.g., { 'UG': 10, 'PG': 5 }
        const reportData = {};
        result.forEach(item => {
            if (item._id) {
                reportData[item._id] = item.count;
            }
        });

        res.json({
            success: true,
            data: reportData
        });

    } catch (error) {
        console.error('Error in universityadmissionreportds:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate admission report',
            error: error.message
        });
    }
};
