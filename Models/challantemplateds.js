const mongoose = require("mongoose");

const challantemplatedsSchema = new mongoose.Schema(
    {
        colid: {
            type: Number,
            required: true,
            index: true
        },

        configName: {
            type: String,
            required: true,
            index: true
        },

        templateHtml: {
            type: String,
            required: true
        },

        orientation: {
            type: String,
            enum: ["portrait", "landscape"],
            default: "landscape"
        },
        
        copies: {
            type: Number,
            default: 3
        },

        isActive: {
            type: Boolean,
            default: true
        },
        version: {
            type: Number,
            default: 1
        },
        createdBy: String,
        updatedBy: String
    },
    {
        timestamps: true
    }
);

// Ensure a single template per config per colid
challantemplatedsSchema.index({ colid: 1, configName: 1 }, { unique: true });

const challantemplateds = mongoose.model("Challantemplateds", challantemplatedsSchema);

module.exports = challantemplateds;