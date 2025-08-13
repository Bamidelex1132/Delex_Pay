const express = require('express');
const router = express.Router();

const uploadProof = require('../middleware/uploadProof');
const { 
    createTransaction,
    updateTransactionStatus,
    submitTransaction
} = require('../controllers/transactionController');

const { authenticateUser, isAdmin } = require('../middleware/authMiddleware');

// ✅ Only admin can update status
router.post('/update-status', authenticateUser, isAdmin, updateTransactionStatus);

// ✅ Create a transaction (for logged-in users)
router.post('/create', authenticateUser, createTransaction);

// ✅ Submit transaction with proof upload
router.post(
    '/submit-transaction', 
    authenticateUser,
    uploadProof.single('proof'), 
    submitTransaction
);

module.exports = router;
