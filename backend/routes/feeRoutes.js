const express = require('express');
const router = express.Router();
const FeeConfig = require('../models/FeeConfig'); // adjust path as needed

// GET /api/fee?currency=NGN&amount=2000
router.get('/', async (req, res) => {
  const { currency, amount } = req.query;

  if (!currency || !amount) {
    return res.status(400).json({ message: "Currency and amount are required" });
  }

  try {
    const config = await FeeConfig.findOne({ currency });
    if (!config) {
      return res.status(404).json({ message: "Fee config not found for this currency" });
    }

    const numericAmount = parseFloat(amount);
    let fee = 0;

    // You can customize thresholds here
    if (currency === "NGN") {
      fee = numericAmount < 5000 ? Math.round(numericAmount * 0.03) : Math.round(numericAmount * 0.01);
    } else if (currency === "USD") {
      fee = numericAmount < 20 ? Math.round(numericAmount * 0.05) : Math.round(numericAmount * 0.02);
    } else {
      fee = Math.round(numericAmount * 0.03); // fallback
    }

    res.json({ fee });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
