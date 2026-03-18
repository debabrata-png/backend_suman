const crmh1 = require('../Models/crmh1.js');
const Kommunocallsessionds = require('../Models/kommunocallsessionds.js');
const leadactivityds = require('../Models/leadactivityds.js');
const Kommunosettingsds = require('../Models/kommunosettingsds.js');

const makeKommunoCall = async (payload, settings, url) => {
    try {
        console.log(`[KOMMUNO] Calling API: ${url}`);
        console.log(`[KOMMUNO] Payload:`, JSON.stringify(payload));
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'accesskey': settings.accessKey,
                'accesstoken': settings.accessToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[KOMMUNO] API Error Status: ${response.status}, Body: ${errorText}`);
            throw new Error(`Kommuno API returned ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log(`[KOMMUNO] API Response:`, JSON.stringify(data));
        return data;
    } catch (err) {
        console.error(`[KOMMUNO] API Fetch Error:`, err);
        throw err;
    }
};

const generateSessionId = () => {
    return Math.floor(1000000000000000 + Math.random() * 9000000000000000).toString();
};

exports.initiatekommunocallds = async (req, res) => {
    try {
        const { lead_id, colid, agentNumber } = req.body;
        if (!lead_id) return res.status(400).json({ success: false, message: 'lead_id is required' });

        // Fetch Lead
        const lead = await crmh1.findById(lead_id);
        if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

        // Fetch Kommuno Settings for this colid
        const settings = await Kommunosettingsds.findOne({ colid: Number(lead.colid || colid) });
        if (!settings) {
            return res.status(400).json({
                success: false,
                message: `Kommuno settings not found for colid: ${lead.colid || colid}. Please configure them first.`
            });
        }

        if (!lead.phone) return res.status(400).json({ success: false, message: 'Lead does not have a phone number' });

        let customerNumber = lead.phone;
        if (customerNumber.length === 10) customerNumber = '+91' + customerNumber;

        let finalAgentNumber = agentNumber;
        if (!finalAgentNumber) {
            return res.status(400).json({ success: false, message: 'agentNumber is required to initiate call' });
        }
        if (finalAgentNumber.length === 10) finalAgentNumber = '+91' + finalAgentNumber;

        const sessionId = generateSessionId();

        const payload = {
            smeId: Number(settings.smeId),
            sessionId: sessionId,
            customerNumber: customerNumber,
            agentNumber: finalAgentNumber,
            recordingFlag: 1,
            pilotNumber: settings.pilotNumber.replace(/"/g, '').trim()
        };

        // Execute Call
        const url = `${settings.baseUrl}/kcrm/clickToCallWithLiveStatus`;
        const kommunoResponse = await makeKommunoCall(payload, settings, url);

        // Store Session Mapping
        await Kommunocallsessionds.create({
            session_id: sessionId,
            lead_id: lead._id,
            colid: settings.colid, // Use colid from settings/lead
            agent_number: finalAgentNumber,
            customer_number: customerNumber,
            status: 'Initiated',
            call_direction: 'OUTGOING'
        });

        // Log initial activity
        await leadactivityds.create({
            lead_id: lead._id,
            colid: settings.colid,
            activity_type: 'call_initiated',
            performed_by: lead.assignedto || lead.user,
            notes: `Outgoing call initiated to ${customerNumber}. Session ID: ${sessionId}`,
            activity_date: new Date()
        });

        return res.status(200).json({
            success: true,
            message: 'Call initiated successfully',
            sessionId: sessionId,
            kommunoResponse: kommunoResponse
        });

    } catch (err) {
        console.error('Error initiating call:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

exports.savekommunosettingsds = async (req, res) => {
    try {
        const { colid, user, smeId, accessToken, accessKey, pilotNumber, baseUrl } = req.body;

        if (!colid || !user) {
            return res.status(400).json({ success: false, message: 'colid and user are required' });
        }

        const settings = await Kommunosettingsds.findOneAndUpdate(
            { colid: Number(colid) },
            {
                user,
                smeId,
                accessToken,
                accessKey,
                pilotNumber,
                baseUrl: baseUrl || 'https://autodialer.kommuno.com/v1'
            },
            { new: true, upsert: true }
        );

        return res.status(200).json({ success: true, data: settings });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

exports.getkommunosettingsds = async (req, res) => {
    try {
        const { colid } = req.query;
        const settings = await Kommunosettingsds.findOne({ colid: Number(colid) });
        if (!settings) return res.status(404).json({ success: false, message: 'Settings not found' });
        return res.status(200).json({ success: true, data: settings });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

exports.kommunoevtcallbackds = async (req, res) => {
    try {
        const payload = req.body;
        const callDetails = payload.call_details;
        const recordingDetails = payload.recording_details;

        if (!callDetails || !callDetails.session_id) {
            return res.status(400).json({ success: false, message: 'Malformed payload' });
        }

        const sessionId = callDetails.session_id;
        let leadId = null;
        let colid = null;
        let leadName = "Student/Lead";

        // 1. Try to find by Session ID
        let session = await Kommunocallsessionds.findOne({ session_id: sessionId });

        if (session) {
            leadId = session.lead_id;
            colid = session.colid;

            // Update session
            session.status = callDetails.overall_call_status || 'Completed';
            session.call_duration = callDetails.duration || 0;
            if (recordingDetails && recordingDetails.recording_path) {
                session.recording_url = recordingDetails.recording_path;
            }
            await session.save();
        } else {
            // 2. Fallback: Find lead by phone number and sme_id (mapped to colid)
            const customerPhone = callDetails.customer_number;
            const smeId = callDetails.sme_id || callDetails.smeId;

            // We need a way to map smeId to colid. 
            // Let's check our settings model for this.
            const settings = await Kommunosettingsds.findOne({ smeId: smeId.toString() });
            if (settings) {
                colid = settings.colid;

                // Clean phone number for matching
                const cleanPhone = customerPhone.replace('+91', '').replace(/\s/g, '');
                const lead = await crmh1.findOne({
                    colid: colid,
                    $or: [
                        { phone: cleanPhone },
                        { phone: '+91' + cleanPhone },
                        { phone: customerPhone }
                    ]
                });

                if (lead) {
                    leadId = lead._id;
                    leadName = lead.name;
                }
            }
        }

        if (leadId) {
            // Update lead name if we have the session/lead record
            if (!session && leadId) {
                // Already found above
            } else if (session) {
                const lead = await crmh1.findById(leadId);
                if (lead) leadName = lead.name;
            }

            let notes = `Call [${callDetails.call_direction || 'UNKNOWN'}] with ${leadName}. Status: ${callDetails.overall_call_status}. Duration: ${callDetails.duration}s.`;
            if (recordingDetails && recordingDetails.recording_path) {
                notes += ` Recording: ${recordingDetails.recording_path}`;
            }

            await leadactivityds.create({
                lead_id: leadId,
                colid: colid,
                activity_type: 'call_recording',
                performed_by: 'System (Call API)',
                notes: notes,
                activity_date: new Date()
            });

            await crmh1.findByIdAndUpdate(leadId, {
                last_contact_date: new Date()
            });
        }

        return res.status(200).json({ success: true, message: 'Webhook received and processed' });

    } catch (err) {
        console.error('Error in kommuno webhook:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
};
