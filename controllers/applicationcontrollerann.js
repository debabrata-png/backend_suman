const applicationFormModel = require('../models/appmodel1');

exports.createApplicationann = async (req, res) => {
    try {
        // Ensure req and res are correctly received from the route
        const formData = { ...req.body };

        // Handle required fields by providing defaults if missing
        if (!formData.email) formData.email = `pending_${Date.now()}@example.com`;
        if (!formData.password) formData.password = "TemporaryPass123!";
        if (!formData.phone) formData.phone = "0000000000";

        const newApplication = new applicationFormModel(formData);
        const savedApplication = await newApplication.save();

        // Use 'res' which is defined in the function arguments above
        return res.status(201).json({
            success: true,
            message: "Application submitted successfully!",
            data: savedApplication
        });

    } catch (error) {
        console.error("Mongoose Validation Error:", error.message);

        // If 'res' was not defined in the arguments, this line would throw the error you saw
        return res.status(400).json({
            success: false,
            message: "Submission failed due to validation.",
            error: error.message
        });
    }
};