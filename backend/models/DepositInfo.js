const mongoose = require('mongoose');

const depositInfoSchema = new mongoose.Schema({
  currency: { type: String, required: true, unique: true },
  accountName: String,
  accountNumber: String,
  bankName: String,
  minAmount: Number,
  maxAmount: Number,
  feeRateBelowMin: Number,  
  feeRateAboveMin: Number,    
  instructions: String
}, {
  timestamps: true  
});


module.exports = mongoose.model('DepositInfo', depositInfoSchema);
