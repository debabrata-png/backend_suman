const WebPage = require("../Models/webpagesds");
const WebSettings = require("../Models/websettingsds");

// --- PAGE CONTROLLERS ---

exports.createWebPage = async (req, res) => {
    try {
        const { colid, title, slug, blocks, seo, created_by } = req.body;

        const existingPage = await WebPage.findOne({ colid, slug });
        if (existingPage) {
            return res.status(400).json({ success: false, message: "Slug already exists for this client" });
        }

        const newPage = new WebPage({ colid, title, slug, blocks, seo, created_by });
        await newPage.save();

        res.status(201).json({ success: true, data: newPage });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getWebPages = async (req, res) => {
    try {
        const { colid } = req.query;
        const pages = await WebPage.find({ colid }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: pages });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getWebPageBySlug = async (req, res) => {
    try {
        const { colid, slug } = req.query;
        const page = await WebPage.findOne({ colid, slug });
        if (!page) return res.status(404).json({ success: false, message: "Page not found" });
        res.status(200).json({ success: true, data: page });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateWebPage = async (req, res) => {
    try {
        const { id } = req.params;
        const page = await WebPage.findByIdAndUpdate(id, req.body, { new: true });
        res.status(200).json({ success: true, data: page });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteWebPage = async (req, res) => {
    try {
        const { id } = req.params;
        await WebPage.findByIdAndDelete(id);
        res.status(200).json({ success: true, message: "Page deleted" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// --- SETTINGS CONTROLLERS ---

exports.getWebSettings = async (req, res) => {
    try {
        const { colid } = req.query;
        let settings = await WebSettings.findOne({ colid });
        if (!settings) {
            // Create default settings if not exists
            settings = new WebSettings({ colid, branding: { site_name: "My Website" } });
            await settings.save();
        }
        res.status(200).json({ success: true, data: settings });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateWebSettings = async (req, res) => {
    try {
        const { colid } = req.body;
        const settings = await WebSettings.findOneAndUpdate(
            { colid }, 
            req.body, 
            { new: true, upsert: true }
        );
        res.status(200).json({ success: true, data: settings });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
