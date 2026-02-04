const mongoose = require('mongoose');

const PipelineStageagSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    user: {
        type: String,
        required: true
    },
    colid: {
        type: Number,
        required: true
    },
    stagename: { type: String },
    description: {
        type: String,
    },
    isactive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('PipelineStageag', PipelineStageagSchema);
