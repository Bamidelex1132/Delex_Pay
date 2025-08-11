const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['credit', 'debit', 'buy', 'sell', 'swap', 'withdraw', 'transfer', 'deposit', 'refund'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    coin: {
      type: String,
      default: '', 
    },
    network: {
      type: String,
      default: '', 
    },
    rate: {
      type: Number,
      default: 0, 
    },
    totalNaira: {
      type: Number,
      default: 0, 
    },
    currency: {
      type: String,
      default: 'NGN',
    },
    paymentDestination: {
      type: String,
      enum: ['wallet', 'bank'],
      default: 'wallet',
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'confirmed', 'successful', 'failed', 'completed', 'submitted'],
      default: 'submitted',
    },
    description: {
      type: String,
      default: '',
    },
    proof: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Transaction', transactionSchema);
