const mongoose = require('mongoose');

const kommunocallsessiondsschema = new mongoose.Schema({
    session_id: { type: String, required: true, unique: true },
    lead_id: { type: mongoose.Schema.Types.ObjectId, ref: 'crmh1', required: true },
    colid: { type: Number, required: true },
    agent_number: { type: String, required: true },
    customer_number: { type: String, required: true },
    status: { type: String, default: 'Initiated' }, 
    call_direction: { type: String }, 
    recording_url: { type: String },
    call_duration: { type: Number }
}, {
    timestamps: true
});

const Kommunocallsessionds = mongoose.model('kommunocallsessionds', kommunocallsessiondsschema);
module.exports = Kommunocallsessionds;
