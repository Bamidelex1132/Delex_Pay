const express = require('express');
const router = express.Router();
const { getDepositInfoByCurrency } = require('../controllers/userController');

router.get('/:currency', getDepositInfoByCurrency);

module.exports = router;
