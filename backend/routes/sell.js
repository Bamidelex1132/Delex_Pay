// routes/sell.js
const express = require('express');
const router = express.Router();

const uploadProof = require('../middleware/uploadProof'); // Multer + Cloudinary middleware
const sellController = require('../controllers/sellController');
const { authenticateUser } = require('../middleware/authMiddleware');
router.post('/sell', authenticateUser, uploadProof.single('proof'), sellController.submitSell);

module.exports = router;
