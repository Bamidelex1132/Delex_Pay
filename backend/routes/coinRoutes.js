const express = require('express');
const router = express.Router();
const coinController = require('../controllers/coinConfig');
const { authenticate, authorizeAdmin } = require('../middleware/authMiddleware');

// Admin routes
//router.post('/add', authenticate, authorizeAdmin, coinController.addCoin);
//router.put('/update/:id', authenticate, authorizeAdmin, coinController.updateCoin);
//router.delete('/delete/:id', authenticate, authorizeAdmin, coinController.deleteCoin);
//router.get('/all', authenticate, authorizeAdmin, coinController.getCoins);

// Public route for users to get available coins
//router.get('/enabled', coinController.getEnabledCoins);
router.get('/prices', coinController.getLiveCoinPrices);

module.exports = router;
