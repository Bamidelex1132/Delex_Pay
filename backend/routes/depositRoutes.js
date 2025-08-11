// routes/depositRoutes.js
const express = require('express');
const router = express.Router();
const depositController = require('../controllers/depositController');

router.get('/options', depositController.getOptions);
router.get('/:currency', depositController.getDepositInfoByCurrency);

module.exports = router;
