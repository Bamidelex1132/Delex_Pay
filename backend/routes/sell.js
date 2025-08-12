// routes/sell.js or in your main router file
const express = require('express');
const router = express.Router();
const uploadProof = require('../middleware/uploadProof'); // your multer Cloudinary middleware
const sellController = require('../controllers/sellController');
const authMiddleware = require('../middleware/authMiddleware'); // your auth middleware

router.post('/sell', authMiddleware, uploadProof.single('proof'), sellController.submitSell);

module.exports = router;
