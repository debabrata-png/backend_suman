const mongoose = require('mongoose');

const webpageBlockSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: [
            'hero', 
            'news_list', 
            'tabbed_grid', 
            'logo_wall', 
            'image_text', 
            'collage', 
            'feature_grid', 
            'contact_form',
            'latest_courses',
            'html_raw',
            'sidebar_content',
            'rich_text'
        ]
    },
    data: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    order: {
        type: Number,
        default: 0
    },
    is_active: {
        type: Boolean,
        default: true
    }
});

const webpagesdsschema = new mongoose.Schema({
    colid: {
        type: Number,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    slug: {
        type: String,
        required: true
    },
    blocks: [webpageBlockSchema],
    seo: {
        meta_title: String,
        meta_description: String,
        meta_keywords: String,
        og_image: String
    },
    status: {
        type: String,
        enum: ['draft', 'published'],
        default: 'published'
    },
    created_by: String
}, {
    timestamps: true
});

// Compound index for uniqueness per client
webpagesdsschema.index({ colid: 1, slug: 1 }, { unique: true });

module.exports = mongoose.model('webpagesds', webpagesdsschema);
