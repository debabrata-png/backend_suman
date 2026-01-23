const express = require('express');
const router = express.Router();
const programmasterdsctlr = require('../controllers/programmasterctlrds');

// Standard CRUD
router.post('/createprogrammasterds', programmasterdsctlr.createprogrammasterds);
// router.get('/getallprogramsds', programmasterdsctlr.getallprogramsds); // Likely exists elsewhere or can be here
// router.get('/getprogrambyidds/:id', programmasterdsctlr.getprogrambyidds);
// router.post('/updateprogrammasterds', programmasterdsctlr.updateprogrammasterds);
// router.delete('/deleteprogrammasterds/:id', programmasterdsctlr.deleteprogrammasterds);

// New Filter Routes
router.get('/getinstitutionsds', programmasterdsctlr.getinstitutionsds);
router.get('/getprogramtypesds', programmasterdsctlr.getprogramtypesds);
router.get('/getprogramsbyfiltersds', programmasterdsctlr.getprogramsbyfiltersds);

module.exports = router;
