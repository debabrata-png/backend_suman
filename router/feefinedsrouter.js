const express = require('express');
const router = express.Router();
const feefinedsctlr = require('../controllers/feefinedsctlr');

router.post('/api/v2/addfeefineds', feefinedsctlr.createfeefineds);
router.get('/api/v2/getallfeefineds', feefinedsctlr.getfeefineds);
router.get('/api/v2/getfeefinedsbyid', feefinedsctlr.getfeefinedsbyid);
router.post('/api/v2/updatefeefineds', feefinedsctlr.updatefeefineds);
router.get('/api/v2/deletefeefineds', feefinedsctlr.deletefeefineds);

module.exports = router;
