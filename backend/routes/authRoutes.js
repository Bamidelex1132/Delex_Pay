const express = require('express');
const router = express.Router();
const {
  register,
  login,
  forgotPassword,
  logoutUser,
  resendVerificationCode,
  verifyCode,
  resetPassword
} = require('../controllers/authController');
const { authenticateUser } = require('../middleware/authMiddleware');

// Routes
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/resend-code', resendVerificationCode);
router.post('/verify-code', verifyCode);
router.post('/logout', authenticateUser, logoutUser);
router.post('/reset-password', resetPassword); 


module.exports = router;
