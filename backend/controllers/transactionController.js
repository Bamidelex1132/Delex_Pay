const Transaction = require('../models/Transaction');
const User = require('../models/User'); 
const nodemailer = require('nodemailer');
const sendEmail = require('../utils/sendEmail');
const dotenv = require('dotenv');
dotenv.config();

const MARKUP_RATE = 0.05; 
const FEE_RATE = 0.05;

const createTransaction = async (req, res) => {
  try {
    console.log("Request body:", req.body);

    const { type, amount } = req.body;


    if (!type || !amount || isNaN(amount)) {
      return res.status(400).json({ message: 'Type and valid amount are required' });
    }


    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'Unauthorized: User not found' });
    }

    const transaction = new Transaction({
      user: req.user._id,
      type,
      amount: parseFloat(amount),
      status: 'pending' 
    });

    await transaction.save();

    return res.status(201).json({
      message: 'Transaction created successfully',
      transaction
    });

  } catch (err) {
    console.error("Error creating transaction:", err);
    return res.status(500).json({ message: 'Server error' });
  }
};

const updateTransactionStatus = async (req, res) => {
  try {
    const { transactionId, status } = req.body;

    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (transaction.status === status) {
      return res.status(400).json({ message: 'Transaction already has this status' });
    }

    const user = await User.findById(transaction.user);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const oldStatus = transaction.status;
    if (['processing', 'pending', 'submitted'].includes(oldStatus)) {
      if (transaction.type === 'deposit' || transaction.type === 'sell') {
        user.frozenBalance -= transaction.amount;
      } else if (transaction.type === 'withdraw' || transaction.type === 'buy') {
        user.frozenBalance -= transaction.amount;
        user.balance += transaction.amount;
      }
    }

    if (['processing', 'pending', 'submitted'].includes(status)) {
      if (transaction.type === 'deposit' || transaction.type === 'sell') {
        user.frozenBalance += transaction.amount;
      } else if (transaction.type === 'withdraw' || transaction.type === 'buy') {
        if (user.balance < transaction.amount) {
          return res.status(400).json({ message: 'Insufficient balance' });
        }
        user.balance -= transaction.amount;
        user.frozenBalance += transaction.amount;
      }
    } else if (status === 'successful') {
      if (transaction.type === 'deposit' || transaction.type === 'sell') {
        user.frozenBalance -= transaction.amount;
        user.balance += transaction.amount;
      } else if (transaction.type === 'withdraw' || transaction.type === 'buy') {
        user.frozenBalance -= transaction.amount;
      }

      if (transaction.type === 'deposit') user.totalDeposited += transaction.amount;
      if (transaction.type === 'withdraw') user.totalWithdrawn += transaction.amount;

      await sendEmail(
        user.email,
        'Transaction Approved - Delex Pay',
        `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; background: #f9f9f9; border-radius: 8px;">
          <h2 style="color: #004aad;">Your transaction has been approved</h2>
          <p>Hi <strong>${user.firstName || user.email}</strong>,</p>
          <p>Your transaction with ID <strong>${transactionId}</strong> has been approved successfully.</p>
          <p><strong>Type:</strong> ${transaction.type}</p>
          <p><strong>Amount:</strong> ${transaction.amount.toFixed(2)}</p>
          <p>Thank you for using Delex Pay.</p>
          <hr/>
          <p style="font-size: 12px; color: #888;">This is an automated message. Please do not reply.</p>
        </div>`
      );

    } else if (status === 'cancelled') {
      await sendEmail(
        user.email,
        'Transaction Rejected - Delex Pay',
        `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; background: #ffe6e6; border-radius: 8px;">
          <h2 style="color: #d9534f;">Your transaction has been rejected</h2>
          <p>Hi <strong>${user.firstName || user.email}</strong>,</p>
          <p>Unfortunately, your transaction with ID <strong>${transactionId}</strong> has been rejected by our admin.</p>
          <p><strong>Type:</strong> ${transaction.type}</p>
          <p><strong>Amount:</strong> ${transaction.amount.toFixed(2)}</p>
          <p>If you believe this is a mistake, please contact support.</p>
          <hr/>
          <p style="font-size: 12px; color: #888;">This is an automated message. Please do not reply.</p>
        </div>`
      );
    }

    transaction.status = status;
    await transaction.save();
    await user.save();

    res.status(200).json({ message: 'Transaction status updated', transaction });
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const submitTransaction = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.file || !(req.file.location || req.file.url)) {
      return res.status(400).json({ message: 'Proof of payment is required' });
    }

    let { type, amount, currency, description } = req.body;
    amount = parseFloat(amount);

    if (!type || !amount || !currency) {
      return res.status(400).json({ message: 'Transaction type, amount, and currency are required' });
    }

    // Fetch live price from CoinGecko
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price?ids=${currency.toLowerCase()}&vs_currencies=ngn`
    );
    const livePrice = response.data[currency.toLowerCase()]?.ngn;

    if (!livePrice) {
      return res.status(400).json({ message: 'Unable to fetch live price for this currency' });
    }

    // Calculate final price per coin
    let finalPricePerCoin;
    if (type === 'buy') {
      finalPricePerCoin = livePrice * (1 + MARKUP_RATE);
    } else if (type === 'sell') {
      finalPricePerCoin = livePrice * (1 - FEE_RATE);
    } else {
      return res.status(400).json({ message: 'Invalid transaction type' });
    }

    const totalValueNGN = amount * finalPricePerCoin;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const proofUrl = req.file.location || req.file.url;

    const newTransaction = new Transaction({
      user: userId,
      type,
      amount,
      pricePerCoin: finalPricePerCoin,
      totalValue: totalValueNGN,
      currency: currency.toUpperCase(),
      description,
      status: 'submitted',
      proof: proofUrl,
    });

    await newTransaction.save();

    // Freeze user's balance
    user.frozenBalance += totalValueNGN;
    await user.save();

    // Send confirmation email
    await sendEmail(
      user.email,
      `${type.charAt(0).toUpperCase() + type.slice(1)} Transaction Submitted - Delex Pay`,
      `
        <p>Hi ${user.firstName || user.email},</p>
        <p>Your ${type} transaction for ${amount} ${currency.toUpperCase()} has been submitted.</p>
        <p>Price per coin: ₦${finalPricePerCoin.toFixed(2)}</p>
        <p>Total value: ₦${totalValueNGN.toFixed(2)}</p>
        <p>Status: Submitted</p>
      `
    );

    res.status(201).json({
      message: 'Transaction submitted successfully',
      transaction: newTransaction
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createTransaction,
  updateTransactionStatus,
  submitTransaction
};
