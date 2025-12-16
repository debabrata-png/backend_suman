const mongoose = require('mongoose');

const agentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    user: {type: String, required: true },
    colid: { type: Number, required: true },
    
});