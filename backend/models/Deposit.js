// models/Deposit.js
const mongoose = require('mongoose');

const depositSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false }, 
  amount: { type: Number, required: true },
  currency: { type: String, required: true },
  method: { type: String, required: true }, 
  fee: { type: Number, required: true },
  total: { type: Number, required: true },
  depositInfoRef: { type: mongoose.Schema.Types.ObjectId, ref: 'DepositInfo' }, 
  status: { type: String, default: 'pending' }, 
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Deposit', depositSchema);
