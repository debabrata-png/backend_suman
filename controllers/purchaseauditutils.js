const purchaseauditlog = require('../Models/purchaseauditlog');
const purchaseRecordLog = async ({
    username,
    useremail,
    action,
    module,
    recordid,
    colid,
    details = {}
}) => {
    try {
        await purchaseauditlog.create({
            username: username || 'System',
            useremail: useremail || 'System',
            action,
            module,
            recordid: recordid ? String(recordid) : null,
            colid,
            details
        });
    } catch (error) {
        console.error('[Purchase Audit] Failed to record log:', error.message);
    }
};

module.exports = { purchaseRecordLog };
