// controllers/sellController.js
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const CoinConfig = require('../models/CoinConfig');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const discountRate = 0.95; // 5% discount

// API to preview payout before submit
const calculatePayout = async (req, res) => {
  try {
    const { coinSymbol, amount } = req.body;

    if (!coinSymbol || !amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid coin or amount.' });
    }

    const coin = await CoinConfig.findOne({ symbol: coinSymbol, status: 'active' });
    if (!coin) return res.status(400).json({ message: 'Coin not found.' });

    const payout = Math.round(amount * coin.rateToNaira * discountRate);

    res.json({ payout });
  } catch (error) {
    console.error('Calculate payout error:', error);
    res.status(500).json({ message: 'Server error calculating payout.' });
  }
};

const submitSell = async (req, res) => {
  try {
    const userId = req.user._id;
    const { coinSymbol, network, amount, payoutDestination, coinSendFrom, confirmationChecked } = req.body;

    if (!coinSymbol || !amount || !payoutDestination || !coinSendFrom || !confirmationChecked) {
      return res.status(400).json({ message: 'Please fill all required fields and confirm sending tokens.' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const coin = await CoinConfig.findOne({ symbol: coinSymbol, status: 'active' });
    if (!coin) return res.status(400).json({ message: 'Coin not available for selling.' });

    let sendToAddressOrEmail = '';
    if (coinSendFrom === 'wallet') {
      if (coin.hasNetwork && network) {
        const net = coin.networks.find(n => n.name.toLowerCase() === network.toLowerCase());
        if (net) {
          sendToAddressOrEmail = net.walletAddress;
        } else {
          return res.status(400).json({ message: 'Invalid network selected for the coin.' });
        }
      } else {
        sendToAddressOrEmail = user.walletAddress || '';
        if (!sendToAddressOrEmail) {
          return res.status(400).json({ message: 'No wallet address found for user.' });
        }
      }
    } else if (coinSendFrom === 'bybit') {
      sendToAddressOrEmail = coin.payoutEmails?.get('bybit') || user.bybitEmail || '';
      if (!sendToAddressOrEmail) {
        return res.status(400).json({ message: 'No Bybit email configured for this coin or user.' });
      }
    } else if (coinSendFrom === 'binance') {
      sendToAddressOrEmail = coin.payoutEmails?.get('binance') || user.binanceEmail || '';
      if (!sendToAddressOrEmail) {
        return res.status(400).json({ message: 'No Binance email configured for this coin or user.' });
      }
    } else {
      return res.status(400).json({ message: 'Invalid coin send source selected.' });
    }

    const payout = Math.round(amount * coin.rateToNaira * discountRate);

    if (user.balance < payout) {
      return res.status(400).json({ message: 'Insufficient balance to cover payout.' });
    }

    user.balance -= payout;
    user.frozenBalance = (user.frozenBalance || 0) + payout;
    await user.save();

    const transaction = new Transaction({
      user: userId,
      type: 'sell',
      amount: payout,
      currency: 'NGN',
      status: 'submitted',
      description: `Sell ${amount} ${coinSymbol} via ${payoutDestination}`,
      coinSymbol,
      network: network || null,
      payoutDestination,
      coinSendFrom,
      sendToAddressOrEmail,
    });

    await transaction.save();

    // Send emails (user + admin)
    const userMailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Sell order submitted',
      text: `Hello ${user.firstName || ''},\n\nYour sell order of ${amount} ${coinSymbol} has been received and is pending approval.\n\nAmount to receive: NGN ${payout}.\nPlease send the coins to: ${sendToAddressOrEmail}\n\nThank you for using Delex Pay.`,
    };

    const adminMailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL || 'admin@delexpay.com',
      subject: 'New sell order submitted',
      text: `User ${user.email} submitted a sell order:\n\nCoin: ${coinSymbol}\nAmount: ${amount}\nPayout: NGN ${payout}\nPayout destination: ${payoutDestination}\nSend source: ${coinSendFrom}\nSend to address/email: ${sendToAddressOrEmail}\n\nPlease review and approve the transaction.`,
    };

    await transporter.sendMail(userMailOptions);
    await transporter.sendMail(adminMailOptions);

    res.status(200).json({
      message: 'Sell order submitted successfully and pending approval.',
      transaction,
      sendToAddressOrEmail,
    });

  } catch (error) {
    console.error('Sell order error:', error);
    res.status(500).json({ message: 'Server error while submitting sell order.' });
  }
};

module.exports = {
  calculatePayout,
  submitSell,
};
