const Transaction = require('../models/Transaction');

const calculateUserBalance = async (userId) => {
  const transactions = await Transaction.find({ user: userId });

  let availableBalance = 0;
  let frozenBalance = 0;

  for (const tx of transactions) {
    if (tx.status === 'approved') {
      if (tx.type === 'deposit') {
        availableBalance += tx.amount;
      } else if (tx.type === 'withdraw' || tx.type === 'transfer') {
        availableBalance -= tx.amount;
      }
    } else if (tx.status === 'pending') {
      if (tx.type === 'deposit') {
        frozenBalance += tx.amount;
      } else if (tx.type === 'withdraw' || tx.type === 'transfer') {
        frozenBalance += tx.amount;
      }
    }
  }

  return {
    availableBalance,
    frozenBalance,
  };
};

module.exports = calculateUserBalance;
