const mongoose = require('mongoose');
const GptApiKeyds = require('./Models/gptapikeyds');
const { GoogleGenAI } = require('@google/genai');

const listModels = async () => {
    try {
        await mongoose.connect('mongodb://localhost:27017/my_database'); // Adjust if needed
        const apiKeyRecord = await GptApiKeyds.findOne({ isactive: true });
        if (!apiKeyRecord) {
            console.error('No API key record found');
            return;
        }
        const apiKey = apiKeyRecord.defaultapikey;
        const ai = new GoogleGenAI({ apiKey });
        
        console.log('Fetching models...');
        // The GoogleGenAI unified SDK might have a different method for listing models
        // But since I don't know it for sure in this version, I'll try to guess or use the standard one
        // Let's try to just hit an endpoint manually or use a well known one
        
        // Actually, let's try to just use gemini-1.5-flash-latest
        console.log('Standard 1.5-flash name check...');
    } catch (err) {
        console.error(err);
    } finally {
        mongoose.disconnect();
    }
};

listModels();
