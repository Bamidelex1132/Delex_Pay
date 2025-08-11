const mongoose = require('mongoose');

const coinSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  symbol: {
    type: String,
    required: true,
  },
  network: {
    type: String,
    default: '',
  },
  rate: {
    type: Number,
    required: true, // e.g. 1 USDT = 1000 NGN
  },
  enabled: {
    type: Boolean,
    default: true, // Admin can disable a coin from being sold
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Coin', coinSchema);
