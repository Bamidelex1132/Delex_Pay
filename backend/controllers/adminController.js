const fs = require('fs');
const path = require('path');
const Deposit = require('../models/Deposit');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// ✅ Get all pending deposits
const getPendingDeposits = async (req, res) => {
  try {
    const pendingDeposits = await Deposit.find({ status: 'pending' }).populate('user', 'firstName lastName email');
    res.status(200).json(pendingDeposits);
  } catch (error) {
    console.error('Error fetching deposits:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ Confirm a deposit
const confirmDeposit = async (req, res) => {
  try {
    const { id } = req.params;

    const deposit = await Deposit.findById(id);
    if (!deposit) return res.status(404).json({ message: "Deposit not found" });

    if (deposit.status === 'confirmed') {
      return res.status(400).json({ message: "Deposit already confirmed" });
    }

    // Update deposit status
    deposit.status = 'confirmed';
    await deposit.save();

    // Update user balance
    const user = await User.findById(deposit.user);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.balance = Number(user.balance) + Number(deposit.amount);
    await user.save();

    // ✅ Create a transaction record
    const transaction = new Transaction({
      user: user._id,
      type: 'credit', // Deposit is a credit
      amount: deposit.amount,
      currency: deposit.currency || 'NGN', // fallback to NGN
      status: 'completed',
      description: 'Deposit confirmed by admin',
    });

    await transaction.save();

    res.status(200).json({
      message: "Deposit confirmed, balance updated, transaction recorded",
      updatedBalance: user.balance
    });
  } catch (error) {
    console.error("Confirm deposit error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Reject a deposit
const rejectDeposit = async (req, res) => {
  try {
    const deposit = await Deposit.findById(req.params.id);
    if (!deposit) return res.status(404).json({ message: 'Deposit not found' });

    // Delete payment proof file if exists
    if (deposit.paymentProof) {
      const filePath = path.join(__dirname, '../uploads/receipt', deposit.paymentProof);
      fs.unlink(filePath, (err) => {
        if (err) console.error('File delete failed:', err);
      });
    }

    await deposit.deleteOne();
    res.json({ message: 'Deposit rejected and file deleted' });
  } catch (err) {
    console.error('Reject deposit error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ Get deposit by ID
const getDepositById = async (req, res) => {
  try {
    const deposit = await Deposit.findById(req.params.id).populate('user', 'firstName lastName email');
    if (!deposit) return res.status(404).json({ message: 'Deposit not found' });
    res.status(200).json(deposit);
  } catch (err) {
    console.error('Get deposit by ID error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
// POST /api/admin/confirm-transaction/:id
const confirmTransaction = async (req, res) => {
  try {
    const transactionId = req.params.id;

    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (transaction.status === 'confirmed') {
      return res.status(400).json({ message: 'Transaction already confirmed' });
    }

    // Confirm the transaction
    transaction.status = 'confirmed';
    await transaction.save();

    // Update user's balance
    await User.findByIdAndUpdate(transaction.user, {
      $inc: { balance: transaction.amount }
    });

    res.json({ message: 'Transaction confirmed and balance updated' });
  } catch (err) {
    console.error('Confirm transaction error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getPendingDeposits,
  confirmDeposit,
  rejectDeposit,
  getDepositById,
  confirmTransaction,
};
