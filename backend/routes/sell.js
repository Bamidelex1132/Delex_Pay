// routes/sell.js
const express = require('express');
const router = express.Router();

const uploadProof = require('../middleware/uploadProof'); // Multer + Cloudinary middleware
const sellController = require('../controllers/sellController');
const  authMiddleware = require('../middleware/authMiddleware');

// Sell route
router.post(
  '/sell',
  authMiddleware,
  uploadProof.single('proof'),
  sellController.submitSell
);

module.exports = router;
