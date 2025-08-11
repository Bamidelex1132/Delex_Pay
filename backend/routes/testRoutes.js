// routes/testEmail.js
const express = require('express');
const router = express.Router();
const sendEmail = require('../utils/sendEmail');

router.get('/test-email', async (req, res) => {
  try {
    await sendEmail('taheebbamidele@gmail.com', 'Test Email', '<p>This is a test email from Delex Pay backend.</p>');
    res.json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    console.error('Email send error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
