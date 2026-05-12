const budgetauditlog = require('../Models/budgetauditlog');

/**
 * Helper to create an audit log entry
 * @param {Object} params 
 */
exports.recordLog = async ({ username, useremail, action, module, recordid, budgetid, colid, details, ip }) => {
    try {
        if (!useremail || !username) {
            console.warn(`Audit Log attempt without user info: ${action} on ${module}`);
        }
        await budgetauditlog.create({
            username: username || 'System',
            useremail: useremail || 'system@campus.tech',
            action,
            module,
            recordid,
            budgetid,
            colid,
            details,
            ip,
            timestamp: new Date()
        });
    } catch (err) {
        console.error('Failed to record audit log:', err);
    }
};
