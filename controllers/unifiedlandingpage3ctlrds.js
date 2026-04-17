const unifiedlandingpageds3 = require("../Models/unifiedlandingpageds3");

// Create Unified Landing Page V3
exports.createunifiedlandingpageds3 = async (req, res) => {
    try {
        const {
            colid,
            page_name,
            page_slug,
            page_url,
            category,
            page_content,
            form_fields,
            created_by,
        } = req.body;

        const existingPage = await unifiedlandingpageds3.findOne({ page_slug });
        if (existingPage) {
            return res.status(400).json({
                success: false,
                message: "Page slug already exists",
            });
        }

        const newPage = new unifiedlandingpageds3({
            colid,
            page_name,
            page_slug,
            page_url,
            category,
            page_content,
            form_fields,
            qr_codes: [],
            created_by,
        });

        await newPage.save();

        res.status(201).json({
            success: true,
            message: "Extended Landing page (V3) created successfully",
            data: newPage,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message,
        });
    }
};

// Get All Unified Landing Pages V3
exports.getallunifiedlandingpagesds3 = async (req, res) => {
    try {
        const { colid } = req.query;
        const pages = await unifiedlandingpageds3.find({ colid }).sort({ created_at: -1 });

        res.status(200).json({
            success: true,
            data: pages,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message,
        });
    }
};

// Get Unified Landing Page V3 by ID
exports.getunifiedlandingpagebyidds3 = async (req, res) => {
    try {
        const { id } = req.params;
        const page = await unifiedlandingpageds3.findById(id);

        if (!page) {
            return res.status(404).json({
                success: false,
                message: "Extended Landing page (V3) not found",
            });
        }

        res.status(200).json({
            success: true,
            data: page,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message,
        });
    }
};

// Get Unified Landing Page V3 by Slug
exports.getunifiedlandingpagebyslugds3 = async (req, res) => {
    try {
        const { slug } = req.params;
        const page = await unifiedlandingpageds3.findOne({ page_slug: slug });

        if (!page) {
            return res.status(404).json({
                success: false,
                message: "Extended Landing page (V3) not found",
            });
        }

        page.visit_count = (page.visit_count || 0) + 1;
        await page.save();

        res.status(200).json({
            success: true,
            data: page,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message,
        });
    }
};

// Update Unified Landing Page V3
exports.updateunifiedlandingpageds3 = async (req, res) => {
    try {
        const { id } = req.query;
        const updateData = req.body;

        const page = await unifiedlandingpageds3.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true,
        });

        if (!page) {
            return res.status(404).json({
                success: false,
                message: "Extended Landing page (V3) not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Extended Landing page (V3) updated successfully",
            data: page,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message,
        });
    }
};

// Delete Unified Landing Page V3
exports.deleteunifiedlandingpageds3 = async (req, res) => {
    try {
        const { id } = req.params;
        const page = await unifiedlandingpageds3.findByIdAndDelete(id);

        if (!page) {
            return res.status(404).json({
                success: false,
                message: "Extended Landing page (V3) not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Extended Landing page (V3) deleted successfully",
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message,
        });
    }
};

// Add QR Code V3
exports.addunifiedqrcodeds3 = async (req, res) => {
    try {
        const { id } = req.query;
        const { qr_name, source, qr_data_url } = req.body;

        const page = await unifiedlandingpageds3.findByIdAndUpdate(
            id,
            {
                $push: {
                    qr_codes: {
                        qr_name,
                        source,
                        qr_data_url,
                        created_at: new Date(),
                    }
                }
            },
            { new: true }
        );

        if (!page) {
            return res.status(404).json({
                success: false,
                message: "Extended Landing page (V3) not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "QR code added successfully",
            data: page,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message,
        });
    }
};

// Delete QR Code V3
exports.deleteunifiedqrcodeds3 = async (req, res) => {
    try {
        const { id, qr_id } = req.query;
        const page = await unifiedlandingpageds3.findById(id);

        if (!page) {
            return res.status(404).json({
                success: false,
                message: "Extended Landing page (V3) not found",
            });
        }

        page.qr_codes = page.qr_codes.filter(
            (qr) => qr._id.toString() !== qr_id
        );

        await page.save();

        res.status(200).json({
            success: true,
            message: "QR code deleted successfully",
            data: page,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message,
        });
    }
};
