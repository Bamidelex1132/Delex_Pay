// models/FeeConfig.js
const mongoose = require('mongoose');

const feeConfigSchema = new mongoose.Schema({
  currency: {
    type: String,
    required: true,
    unique: true,
  },
  rate: {
    type: Number,
    required: true,
  }
});

module.exports = mongoose.model('FeeConfig', feeConfigSchema);
