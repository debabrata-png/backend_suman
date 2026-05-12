const express = require('express');
const institutionsController = require('../controllers/institutionsctlrds');

const router = express.Router();

router.route('/checkinstitutionsds/:colid')
    .get(institutionsController.checkInstitutionsds);

module.exports = router;
