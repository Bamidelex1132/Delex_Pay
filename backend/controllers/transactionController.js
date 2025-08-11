const Transaction = require('../models/Transaction');
const User = require('../models/User'); 
const nodemailer = require('nodemailer');
const sendEmail = require('../utils/sendEmail');
const dotenv = require('dotenv');
dotenv.config();



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

    if (!req.file) {
      return res.status(400).json({ message: 'Proof of payment is required' });
    }

    const { type, amount, currency, description } = req.body;

    if (!type || !amount) {
      return res.status(400).json({ message: 'Transaction type and amount are required' });
    }

        const amountNum = parseFloat(amount);
    const feeRate = 0.05; // 5%
    const fee = parseFloat((amountNum * feeRate).toFixed(2));
    const total = parseFloat((amountNum + fee).toFixed(2));


     const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const newTransaction = new Transaction({
      user: userId,
      type,
      amount: amountNum,
      fee,
      currency: currency || 'NGN',
      description,
      status: 'submitted',
      proof: `/uploads/proofs/${req.file.filename}` 
    });

    await newTransaction.save();

        user.frozenBalance += amountNum;
        await user.save();


         await sendEmail(
  user.email,
  'Deposit Submitted - Delex Pay',
  `
  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff; padding: 30px; color: #333;">
    <h2 style="color: #004aad; text-align: center; margin-bottom: 25px; font-weight: 700;">Delex Pay - Deposit Submitted</h2>
    <p style="font-size: 16px; line-height: 1.5;">Hi <strong>${user.firstName || user.email}</strong>,</p>
    <p style="font-size: 16px; line-height: 1.5; margin-top: 10px;">We have successfully received your deposit submission. Our team will review and verify it shortly.</p>
    <table style="width: 100%; border-collapse: collapse; margin: 25px 0;">
      <tbody>
        <tr>
          <td style="padding: 8px 12px; border: 1px solid #ddd; font-weight: 600;">Amount:</td>
          <td style="padding: 8px 12px; border: 1px solid #ddd;">${amountNum.toFixed(2)} ${currency}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; border: 1px solid #ddd; font-weight: 600;">Fee:</td>
          <td style="padding: 8px 12px; border: 1px solid #ddd;">${fee.toFixed(2)} ${currency}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; border: 1px solid #ddd; font-weight: 600;">Total:</td>
          <td style="padding: 8px 12px; border: 1px solid #ddd;">${total.toFixed(2)} ${currency}</td>
        </tr>
      </tbody>
    </table>
    <p style="font-size: 16px; line-height: 1.5;">Thank you for choosing Delex Pay.</p>
    <p style="margin-top: 30px; font-size: 14px; color: #888;">Delex Pay Team</p>
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
    <p style="font-size: 12px; color: #999; text-align: center;">This is an automated message. Please do not reply.</p>
  </div>
  `
        );

    const adminEmails = ['toheebdikko@gmail.com', 'toheebdikko@outlook.com']; 
    for (const adminEmail of adminEmails) {
      await sendEmail(
        adminEmail,
        'New Deposit Submitted',
        `<p>User ${user.email} submitted a deposit of ${amountNum} ${currency}. Please review.</p>`
      );
    }

    return res.status(201).json({ message: 'Transaction submitted successfully', transaction: newTransaction });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createTransaction,
  updateTransactionStatus,
  submitTransaction
};
