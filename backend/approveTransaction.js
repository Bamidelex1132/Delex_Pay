const mongoose = require('mongoose');
const Transaction = require('./models/Transaction');  
const User = require('./models/User');          
const sendEmail = require('./utils/sendEmail'); 
require('dotenv').config();

async function approveTransaction(transactionId) {
  try {
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      console.error('Transaction not found');
      process.exit(1);
    }

    if (transaction.status === 'confirmed') {
      console.log('Transaction is already successful');
      process.exit(0);
    }

    const user = await User.findById(transaction.user);
    if (!user) {
      console.error('User not found');
      process.exit(1);
    }

    if (transaction.type === 'deposit' || transaction.type === 'sell') {
      user.frozenBalance -= transaction.amount;
      user.balance += transaction.amount;
    } else if (transaction.type === 'withdraw' || transaction.type === 'buy') {
      user.frozenBalance -= transaction.amount;
    }

    transaction.status = 'confirmed';

    await user.save();
    await transaction.save();

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

    console.log('Transaction approved and email sent.');

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}


(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');

    const transactionId = '689645bc93bef5870bc85be5'; 
    await approveTransaction(transactionId);
  } catch (err) {
    console.error('Connection error:', err);
    process.exit(1);
  }
})();
