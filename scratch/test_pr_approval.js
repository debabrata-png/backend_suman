const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './config.env' });

const prapproverds = require('../Models/prapproverds');
const storerequisationds2 = require('../Models/storerequisationds2');
const purchaseauditlog = require('../Models/purchaseauditlog');

const DB = process.env.DATABASE2 || process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);

async function runTest() {
    try {
        await mongoose.connect(DB);
        console.log('Connected to DB');

        const TEST_COLID = 444444; // Unique test colid

        // 0. Cleanup
        await prapproverds.deleteMany({ colid: TEST_COLID });
        await storerequisationds2.deleteMany({ colid: TEST_COLID });
        await purchaseauditlog.deleteMany({ colid: TEST_COLID });

        console.log('--- Scenario 1: No Approvers ---');
        const req1 = await (require('../controllers/storerequisationdsctlr2').addstorerequisationds2)({
            body: {
                colid: TEST_COLID,
                itemname: 'Test Item 1',
                quantity: 10,
                user: 'test@user.com',
                name: 'Test User'
            }
        }, {
            status: (code) => ({ json: (data) => data })
        });
        console.log('PR 1 Status:', req1.data.reqstatus); // Expected: Pending

        console.log('--- Scenario 2: With Approvers ---');
        await prapproverds.create({ colid: TEST_COLID, approvername: 'App 1', approveruserid: 'app1@test.com', level: 1 });
        await prapproverds.create({ colid: TEST_COLID, approvername: 'App 2', approveruserid: 'app2@test.com', level: 2 });

        const req2 = await (require('../controllers/storerequisationdsctlr2').addstorerequisationds2)({
            body: {
                colid: TEST_COLID,
                itemname: 'Test Item 2',
                quantity: 20,
                user: 'test@user.com'
            }
        }, {
            status: (code) => ({ json: (data) => data })
        });
        console.log('PR 2 Status:', req2.data.reqstatus); // Expected: Pending Approval
        console.log('PR 2 Step:', req2.data.currentStep); // Expected: 1

        console.log('--- Scenario 3: Partial Approval ---');
        const pr2_approved_step1 = await (require('../controllers/prapproverctlr2').verifyPRStep2)({
            body: {
                id: req2.data._id,
                user_email: 'app1@test.com'
            }
        }, {
            status: (code) => ({ json: (data) => data })
        });
        console.log('After Step 1 - Status:', pr2_approved_step1.data.reqstatus); // Expected: Pending Approval
        console.log('After Step 1 - Step:', pr2_approved_step1.data.currentStep); // Expected: 2

        console.log('--- Scenario 4: Full Approval ---');
        const pr2_fully_approved = await (require('../controllers/prapproverctlr2').verifyPRStep2)({
            body: {
                id: req2.data._id,
                user_email: 'app2@test.com'
            }
        }, {
            status: (code) => ({ json: (data) => data })
        });
        console.log('Final Status:', pr2_fully_approved.data.reqstatus); // Expected: Pending

        console.log('--- Scenario 5: Audit Logs ---');
        const logs = await purchaseauditlog.find({ colid: TEST_COLID });
        console.log('Audit Logs Count:', logs.length);
        logs.forEach(log => console.log(`[${log.action}] ${log.details.status || 'Approved Level ' + log.details.level}`));

    } catch (e) {
        console.error('Test Failed:', e);
    } finally {
        await mongoose.connection.close();
    }
}

runTest();
