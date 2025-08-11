const mongoose = require('mongoose');

const networkSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },          
  walletAddress: { 
    type: String, 
    required: true 
  }, 
});

const coinConfigSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  symbol: {
    type: String,
    required: true,
    unique: true,
  },
  hasNetwork: {
    type: Boolean,
    default: false,
  },
  networks: {
    type: [networkSchema],
    default: [],
  },
  rateToNaira: {
    type: Number,
    required: true,
  },
  minAmount: {
    type: Number,
    default: 1,
    min: 0,
  },
  payoutEmails: {
    type: Map,
    of: String,
    default: {},
  },
  status: {
    type: String,
    enum: ['active', 'disabled'],
    default: 'active',
  },
}, { timestamps: true });

module.exports = mongoose.model('CoinConfig', coinConfigSchema);
