const express = require('express');
const router = express.Router();
const poconfigdsctlr = require('../controllers/poconfigdsctlr');

router.post('/addpoconfigds', poconfigdsctlr.addpoconfigds);
router.get('/getpoconfigds', poconfigdsctlr.getpoconfigds); // Fetch single/latest
router.post('/updatepoconfigds', poconfigdsctlr.updatepoconfigds);

module.exports = router;
