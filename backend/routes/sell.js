// routes/sell.js or in your main router file
const express = require('express');
const router = express.Router();
const uploadProof = require('../middleware/uploadProof'); // your multer Cloudinary middleware
const sellController = require('../controllers/sellController');
const { authMiddleware } = require('../middleware/authMiddleware');
console.log('authMiddleware:', typeof authMiddleware);
console.log('uploadProof:', typeof uploadProof);
console.log('sellController.submitSell:', typeof sellController?.submitSell);


router.post('/sell', authMiddleware, uploadProof.single('proof'), sellController.submitSell);

module.exports = router;
