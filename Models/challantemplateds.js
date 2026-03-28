const mongoose = require("mongoose");

const challantemplatedsSchema = new mongoose.Schema(
    {
        colid: {
            type: Number,
            required: true,
            index: true
        },

        name: {
            type: String,
            required: true
        },

        description: String,
        template: {
            type: String,
            required: true
        },

        fields: [
            {
                key: { type: String, required: true },
                label: { type: String, required: true },
                type: {
                    type: String,
                    enum: ["text", "number", "date", "select"],
                    default: "text"
                },
                required: { type: Boolean, default: false },
                defaultValue: mongoose.Schema.Types.Mixed,
                options: [String] // for select dropdown
            }
        ],
        sections: [
            {
                name: String,
                template: String
            }
        ],
        styles: {
            fontFamily: { type: String, default: "Arial" },
            fontSize: { type: String, default: "12px" },
            primaryColor: String,
            secondaryColor: String,
            customCSS: String
        },
        defaults: {
            type: Map,
            of: mongoose.Schema.Types.Mixed
        },
        version: {
            type: Number,
            default: 1
        },
        isActive: {
            type: Boolean,
            default: true
        },
        createdBy: String,
        updatedBy: String
    },
    {
        timestamps: true
    }
);

const challantemplateds = mongoose.model("Challantemplateds", challantemplatedsSchema);

module.exports = challantemplateds;