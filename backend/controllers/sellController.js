const User = require('../models/User');
const Transaction = require('../models/Transaction');
const CoinConfig = require('../models/CoinConfig');
const axios = require('axios');
const sendEmail = require('../utils/sendEmail');

// Fee percentage for sell transactions (5%)
const SELL_FEE_PERCENT = 5;

exports.submitSell = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get form data
    let { coinSymbol, network, amount, payoutDestination, confirmationChecked } = req.body;
    amount = parseFloat(amount);

    // Validate required fields
    if (!coinSymbol || !amount || !payoutDestination || !confirmationChecked) {
      return res.status(400).json({ message: 'All fields including confirmation are required' });
    }

    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    if (!['wallet', 'bank'].includes(payoutDestination)) {
      return res.status(400).json({ message: 'Invalid payout destination' });
    }

    // Load user
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Check payout destination requirements
    if (payoutDestination === 'bank') {
      if (!user.bankDetails || !user.bankDetails.bankVerified) {
        return res.status(400).json({ message: 'Bank account not verified' });
      }
    }

    if (payoutDestination === 'wallet') {
      if (user.balance < amount) {
        return res.status(400).json({ message: 'Insufficient wallet balance' });
      }
    }

    // Get coin config
    const coinConfig = await CoinConfig.findOne({ symbol: coinSymbol.toUpperCase(), status: 'active' });
    if (!coinConfig) {
      return res.status(400).json({ message: 'Unsupported or inactive coin' });
    }

    // Validate network if coin requires it
    if (coinConfig.hasNetwork) {
      if (!network || !coinConfig.networks.some(n => n.name === network)) {
        return res.status(400).json({ message: 'Invalid or missing network' });
      }
    }

    // Fetch live price from CoinGecko
    const coinId = coinConfig.name.toLowerCase();
    const priceResponse = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=ngn`
    );
    const livePriceNGN = priceResponse.data?.[coinId]?.ngn;
    if (!livePriceNGN) {
      return res.status(500).json({ message: 'Failed to fetch live coin price' });
    }

    // Calculate price per coin after fee deduction
    const pricePerCoin = livePriceNGN * (1 - SELL_FEE_PERCENT / 100);
    const totalNaira = pricePerCoin * amount;

    // Proof upload URL (if any)
    const proofUrl = req.file?.path || req.file?.location || '';

    // Create transaction
    const newTransaction = new Transaction({
      user: userId,
      type: 'sell',
      amount,
      coin: coinSymbol.toUpperCase(),
      network: network || '',
      rate: pricePerCoin,
      totalNaira,
      currency: 'NGN',
      paymentDestination: payoutDestination,
      status: 'submitted',
      description: `Sell order for ${amount} ${coinSymbol.toUpperCase()}`,
      proof: proofUrl,
    });

    await newTransaction.save();

    // Update user balances if payout to wallet
    if (payoutDestination === 'wallet') {
      user.balance -= amount;
      user.frozenBalance += amount;
      await user.save();
    }

    // Send confirmation email
    await sendEmail(
      user.email,
      'Sell Order Submitted - Delex Pay',
      `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; background: #f0f4f8; border-radius: 8px;">
        <h2 style="color: #004aad;">Sell Order Received</h2>
        <p>Hi <strong>${user.firstName || user.email}</strong>,</p>
        <p>Your sell order has been received and is now pending approval.</p>
        <p><strong>Coin:</strong> ${coinSymbol.toUpperCase()}</p>
        <p><strong>Amount:</strong> ${amount}</p>
        <p><strong>Price per coin (NGN):</strong> ₦${pricePerCoin.toFixed(2)}</p>
        <p><strong>Total payout (NGN):</strong> ₦${totalNaira.toFixed(2)}</p>
        <p><strong>Payout destination:</strong> ${payoutDestination === 'wallet' ? 'Wallet balance' : 'Bank Account'}</p>
        <hr/>
        <p style="font-size: 12px; color: #666;">You will receive another email once your transaction is approved or rejected.</p>
      </div>
      `
    );

    return res.status(201).json({
      message: 'Sell order submitted successfully',
      transaction: newTransaction,
    });

  } catch (error) {
    console.error('Sell submission error:', error);
    return res.status(500).json({ message: 'Server error while submitting sell order' });
  }
};
