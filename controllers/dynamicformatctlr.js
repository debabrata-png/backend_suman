const DynamicPaperFormatds = require('../Models/dynamicpaperformatds');
const DynamicQuestionsds = require('../Models/dynamicquestionsds');
const Questionbankds = require('../Models/questionbankds');
const GptApiKeyds = require('../Models/gptapikeyds');
const { GoogleGenAI } = require('@google/genai');

// Save or Update Dynamic Paper Format
exports.saveDynamicFormat = async (req, res) => {
    try {
        const { user, colid, questionbankcode, structure, totalmarks, instructions } = req.body;

        if (!user || !colid || !questionbankcode || !structure) {
            return res.status(400).json({
                success: false,
                message: 'Required fields missing: user, colid, questionbankcode, structure'
            });
        }

        let format = await DynamicPaperFormatds.findOne({ questionbankcode, colid });

        if (format) {
            format.structure = structure;
            format.totalmarks = totalmarks;
            format.instructions = instructions;
            format.user = user;
            await format.save();
        } else {
            format = await DynamicPaperFormatds.create({
                user, colid, questionbankcode, structure, totalmarks, instructions
            });

            // Update the question bank type to dynamic
            await Questionbankds.findOneAndUpdate(
                { questionbankcode, colid },
                { papertype: 'dynamic' }
            );
        }

        res.status(200).json({
            success: true,
            message: 'Format saved successfully',
            data: format
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get Dynamic Paper Format by Code
exports.getDynamicFormatByCode = async (req, res) => {
    try {
        const { questionbankcode, colid } = req.query;

        const format = await DynamicPaperFormatds.findOne({
            questionbankcode,
            colid: parseInt(colid)
        });

        if (!format) {
            return res.status(404).json({
                success: false,
                message: 'Format not found for this question bank'
            });
        }

        res.status(200).json({ success: true, data: format });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Save Dynamic Questions (Bulk)
exports.saveDynamicQuestions = async (req, res) => {
    try {
        const { user, colid, questionbankcode, formatid, questions } = req.body;

        if (!questions || !Array.isArray(questions)) {
            return res.status(400).json({ success: false, message: 'Questions array is required' });
        }

        // Delete existing questions for this format to overwrite
        await DynamicQuestionsds.deleteMany({ formatid, colid });

        const questionsToSave = questions.map(q => ({
            ...q,
            user,
            colid,
            questionbankcode,
            formatid
        }));

        const savedQuestions = await DynamicQuestionsds.insertMany(questionsToSave);

        res.status(200).json({
            success: true,
            message: 'Questions saved successfully',
            count: savedQuestions.length
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get Dynamic Questions for a Format
exports.getDynamicQuestions = async (req, res) => {
    try {
        const { formatid, colid } = req.query;

        const questions = await DynamicQuestionsds.find({
            formatid,
            colid: parseInt(colid)
        }).sort({ questionNo: 1, partLabel: 1 });

        res.status(200).json({ success: true, data: questions });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
// Utility to strip Markdown triple backticks from AI responses
const cleanAIJson = (text) => {
    if (!text) return "";
    return text.toString().replace(/```json|```/g, "").trim();
};

// AI Generation for Dynamic Questions (Supports single or bulk)
exports.generateQuestionsAI = async (req, res) => {
    try {
        const { questionbankcode, format, difficulty, keywords, colid, user, targetNodeId } = req.body;

        if (!format || !keywords) {
            return res.status(400).json({ success: false, message: 'Format and keywords are required' });
        }

        // 1. Fetch API Key (Prioritizing personal one as requested)
        let apiKeyRecord = await GptApiKeyds.findOne({ colid: parseInt(colid), user: user, isactive: true });

        // If no user-specific record, fallback to college-wide record
        if (!apiKeyRecord) {
            apiKeyRecord = await GptApiKeyds.findOne({ colid: parseInt(colid), isactive: true });
        }

        if (!apiKeyRecord) {
            return res.status(404).json({ success: false, message: 'No AI API settings found for this account/institution' });
        }

        const apiKey = (apiKeyRecord.usepersonalkey && apiKeyRecord.personalapikey)
            ? apiKeyRecord.personalapikey
            : apiKeyRecord.defaultapikey;

        if (!apiKey || apiKey.length < 10) {
            return res.status(400).json({ success: false, message: 'Valid Gemini API key missing (Personal/Default)' });
        }

        // QUOTA SAVER: 30-second delay for a single request
        //console.log(`[AI QUOTA SAVER] Waiting 30-40s for Batch AI Generation (User: ${user})...`);
        await new Promise(resolve => setTimeout(resolve, 30000));

        const genAI = new GoogleGenAI({ apiKey: apiKey });

        // 2. Prepare the entire structure for the AI (Handles both full object or direct array)
        const formatStructure = (format && format.structure) ? format.structure : format;

        if (!Array.isArray(formatStructure)) {
            return res.status(400).json({ success: false, message: 'Invalid format structure received' });
        }

        let leafNodesToProcess = [];
        const traverse = (nodes, path = []) => {
            nodes.forEach(node => {
                const currentPath = [...path, node.label];
                if (node.type === 'leaf') {
                    leafNodesToProcess.push({
                        id: node.id,
                        label: node.label,
                        fullPath: currentPath.join(' > '),
                        marks: node.marks
                    });
                } else if (node.children) {
                    traverse(node.children, currentPath);
                }
            });
        };
        traverse(formatStructure);

        if (leafNodesToProcess.length === 0) {
            return res.status(400).json({ success: false, message: 'No questions to generate' });
        }

        // 3. Construct a high-density prompt for the WHOLE paper
        const prompt = `You are a professional educational question paper generator. 
        Generate ${leafNodesToProcess.length} HIGH-QUALITY, unique exam questions and answers based on:
        Keywords/Topics: ${keywords}
        Overall Difficulty: ${difficulty}
        
        You MUST provide a question and answer for EVERY part listed below:
        ${leafNodesToProcess.map(ln => `- Part "${ln.label}" (Path: ${ln.fullPath}) worth ${ln.marks} marks`).join('\n')}
        
        Return the result as a STRICT JSON array of objects.
        Do NOT wrap in markdown backticks.
        Each object must have: "nodeId" (matching the input ID), "partLabel" (matching the input label), "question", "answer".
        
        Format: [ {"nodeId": "...", "partLabel": "...", "question": "...", "answer": "..."} ]`;

        // 4. Call Gemini (Retry logic kept for extreme stability)
        let result;
        let lastError;
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                if (attempt > 1) {
                    //console.log(`[AI QUOTA SAVER] Retry attempt ${attempt}/3...`);
                    await new Promise(resolve => setTimeout(resolve, 10000));
                }

                result = await genAI.models.generateContent({
                    model: "gemini-2.5-flash",
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: { responseMimeType: "application/json" }
                });

                if (result && result.text) break;
            } catch (err) {
                lastError = err;
                //console.error(`[AI ERROR] Batch attempt ${attempt} failed:`, err.message);
            }
        }

        if (!result || !result.text) {
            throw new Error(lastError ? lastError.message : 'AI generation failed');
        }

        const generated = JSON.parse(cleanAIJson(result.text));

        res.status(200).json({
            success: true,
            questions: generated
        });
    } catch (error) {
        //console.error('AI Generation Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
