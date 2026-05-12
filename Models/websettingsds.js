const mongoose = require('mongoose');

const websettingsdsschema = new mongoose.Schema({
    colid: {
        type: Number,
        required: true,
        unique: true
    },
    branding: {
        logo_url: String,
        site_name: String,
        primary_color: { type: String, default: '#2563eb' },
        secondary_color: { type: String, default: '#f59e0b' },
        favicon_url: String
    },
    navbar: {
        links: [{
            label: String,
            slug: String, // e.g., 'about' or 'https://external.com'
            is_external: { type: Boolean, default: false },
            sub_links: [{
                label: String,
                slug: String,
                is_external: { type: Boolean, default: false }
            }]
        }],
        cta_button: {
            label: String,
            slug: String
        }
    },
    footer: {
        columns: [{
            title: String,
            links: [{
                label: String,
                slug: String,
                is_external: { type: Boolean, default: false }
            }]
        }],
        social_links: {
            facebook: String,
            twitter: String,
            instagram: String,
            linkedin: String,
            youtube: String
        },
        contact_info: {
            address: String,
            phone: String,
            email: String
        },
        copyright_text: { type: String, default: '© 2024 All Rights Reserved' }
    },
    custom_css: String,
    custom_js: String
}, {
    timestamps: true
});

module.exports = mongoose.model('websettingsds', websettingsdsschema);
