const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate } = require('../middleware/authMiddleware');
const authorizeAdmin = require('../middleware/authorizeAdmin');
const { updateTransactionStatus } = require('../controllers/transactionController');
const adminOnly = require('../middleware/authorizeAdmin');


// Deposit routes
router.put('/deposits/:id/confirm', authenticate, authorizeAdmin, adminController.confirmDeposit);
router.delete('/deposits/:id/reject', authenticate, authorizeAdmin, adminController.rejectDeposit);
router.get('/deposits', authenticate, authorizeAdmin, adminController.getPendingDeposits);
router.get('/deposits/:id', authenticate, authorizeAdmin, adminController.getDepositById);

// Transaction confirmation
router.post('/confirm-transaction/:id', authenticate, authorizeAdmin, adminController.confirmTransaction);
router.post('/transaction/update-status', authenticate, adminOnly, updateTransactionStatus);

module.exports = router;
