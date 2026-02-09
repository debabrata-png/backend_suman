const mongoose = require('mongoose');

const subjectcomponentconfig11dsschema = new mongoose.Schema({
    name: { type: String, required: true },
    user: { type: String, required: true },
    colid: { type: Number, required: true },

    // Subject identification
    subjectcode: { type: String, required: true },
    subjectname: { type: String, required: true },

    // Academic context
    semester: { type: String, required: true }, // "9" or "10"
    academicyear: { type: String, required: true }, // "2024-25"

    unitpremid: { type: Number },
    unitpostmid: { type: Number },

    halfyearlyth: { type: Number },
    halfyearlypractical: { type: Number },

    annualth: { type: Number },
    annualpractical: { type: Number },

    // Status
    isactive: { type: Boolean, default: true },
    isadditional: { type: Boolean, default: false }, // Marks subject as additional (not part of main scholastic area)

    createdat: { type: Date, default: Date.now },
    updatedat: { type: Date, default: Date.now }
});

// Unique constraint
subjectcomponentconfig11dsschema.index({
    colid: 1,
    subjectcode: 1,
    semester: 1,
    academicyear: 1
}, { unique: true });

const subjectcomponentconfig11ds = mongoose.model('subjectcomponentconfig11ds', subjectcomponentconfig11dsschema);

module.exports = subjectcomponentconfig11ds;
