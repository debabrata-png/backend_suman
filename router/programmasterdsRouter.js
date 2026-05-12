const express = require('express');
const router = express.Router();
const programcounselorctlr = require('../controllers/programcounselorcontrollerds');

// Standard CRUD
// router.post('/createprogrammasterds', programmasterdsctlr.createprogrammasterds);
// router.get('/getallprogramsds', programmasterdsctlr.getallprogramsds); 
// router.get('/getprogrambyidds/:id', programmasterdsctlr.getprogrambyidds);
// router.post('/updateprogrammasterds', programmasterdsctlr.updateprogrammasterds);
// router.delete('/deleteprogrammasterds/:id', programmasterdsctlr.deleteprogrammasterds);

// New Filter Routes
router.get('/getinstitutionsds', programcounselorctlr.getinstitutionsds);
router.get('/getprogramtypesds', programcounselorctlr.getprogramtypesds);
router.get('/getprogramsbyfiltersds', programcounselorctlr.getprogramsbyfiltersds);

module.exports = router;
