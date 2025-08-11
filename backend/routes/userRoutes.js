const express = require('express');
const router = express.Router();
const User = require('../models/User');


// My Middleware
const { authenticateUser } = require('../middleware/authMiddleware');
const uploadReceipt = require("../middleware/uploadReceipt");
const uploadProof = require('../middleware/uploadProof');
const uploadProfile = require('../middleware/uploadMiddleware');
const coinConfig = require('../models/coinConfig');
// My Controllers
const transactionController = require('../controllers/transactionController');
const { logoutUser } = require('../controllers/authController');
const {
  getDashboardData,
  getBasicUserData,
  updateProfile,
  getUserTransactions,
  getDepositInfoByCurrency,
} = require('../controllers/userController');
const { submitDeposit } = require('../controllers/depositController');
const { submitSell } = require('../controllers/sellController');

// My Routes
router.get('/dashboard', authenticateUser, getDashboardData);
router.get('/profile', authenticateUser, getBasicUserData);
router.put('/profile', authenticateUser, uploadProfile.single('profilePic'), updateProfile);
router.post('/transaction', authenticateUser, transactionController.createTransaction);
router.post('/submit-deposit', authenticateUser, uploadProof.single('proof'), submitDeposit);
router.post('/sell', authenticateUser, uploadProof.single('proof'), submitSell);
router.get('/transactions', authenticateUser, getUserTransactions);
router.get('/deposit-info', getDepositInfoByCurrency);
//router.get('/banks', authenticateUser, getBanks);
router.get('/banks/:currency', getDepositInfoByCurrency);
router.post('/bank-details', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const { accountNumber, accountName, bankName } = req.body;

    if (!accountNumber || !accountName || !bankName) {
      return res.status(400).json({ message: 'Please provide account number, account name, and bank name.' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    user.bankDetails = {
      accountNumber,
      accountName,
      bankName,
      bankVerified: false,
      submittedAt: new Date()
    };

    await user.save();

    res.json({ message: 'Bank details submitted successfully and pending verification.' });
  } catch (error) {
    console.error('Error updating bank details:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
router.get('/coins', authenticateUser, async (req, res) => {
  try {
    const coins = await CoinConfig.find({ status: 'active' });
    res.json(coins);
  } catch (error) {
    console.error('Error fetching coins:', error);
    res.status(500).json({ message: 'Failed to fetch coins' });
  }
});
router.post('/logout', authenticateUser, logoutUser);

module.exports = router;
