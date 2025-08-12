// routes/depositRoutes.js
const express = require('express');
const router = express.Router();
const depositController = require('../controllers/depositController');
const multer = require('multer');
const uploadProof = require('../middleware/uploadProof');
// Use memory storage so we can upload to cloud instead of Render's disk
const storage = multer.memoryStorage();
const upload = multer({ storage });

// GET routes
router.get('/options', depositController.getOptions);
router.get('/:currency', depositController.getDepositInfoByCurrency);

// POST route for submitting deposit
router.post('/submit', upload.single('proof'), depositController.submitDeposit);

module.exports = router;
