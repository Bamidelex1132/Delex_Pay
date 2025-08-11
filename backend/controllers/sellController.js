// controllers/sellController.js
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const CoinConfig = require('../models/CoinConfig');
const nodemailer = require('nodemailer');
const axios = require('axios');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const discountRate = 0.95; // 5% discount on payout when selling

// Helper: fetch live NGN price from CoinGecko fallback to coin config rate
async function getLivePrice(coinSymbol) {
  try {
    const res = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinSymbol.toLowerCase()}&vs_currencies=ngn`
    );
    return res.data[coinSymbol.toLowerCase()]?.ngn || null;
  } catch (error) {
    console.warn('Failed to fetch live price:', error.message);
    return null;
  }
}

// API to preview payout before submit
const calculatePayout = async (req, res) => {
  try {
    let { coinSymbol, amount } = req.body;
    if (!coinSymbol || !amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid coin or amount.' });
    }

    coinSymbol = coinSymbol.toUpperCase();

    const coin = await CoinConfig.findOne({ symbol: coinSymbol, status: 'active' });
    if (!coin) return res.status(400).json({ message: 'Coin not found.' });

    const livePrice = (await getLivePrice(coinSymbol)) || coin.rateToNaira;
    if (!livePrice) return res.status(400).json({ message: 'Price data not available.' });

    const payout = Math.round(amount * livePrice * discountRate);

    res.json({ payout, pricePerCoin: livePrice * discountRate });
  } catch (error) {
    console.error('Calculate payout error:', error);
    res.status(500).json({ message: 'Server error calculating payout.' });
  }
};

// Submit sell order

const submitSell = async (req, res) => {
  try {
    const userId = req.user._id;
    let { coinSymbol, network, amount, payoutDestination, coinSendFrom, confirmationChecked } = req.body;

    // Validate confirmation checkbox
    const confirmed = confirmationChecked === true || confirmationChecked === 'true' || confirmationChecked === 'on';
    if (!confirmed) {
      return res.status(400).json({ message: 'Please confirm you have sent the tokens.' });
    }

    // Validate and parse amount
    amount = parseFloat(amount);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount.' });
    }

    // Check required fields
    if (!coinSymbol || !payoutDestination || !coinSendFrom) {
      return res.status(400).json({ message: 'Please fill all required fields.' });
    }

    // Check proof file uploaded
    if (!req.file || !(req.file.location || req.file.url)) {
      return res.status(400).json({ message: 'Proof of payment is required.' });
    }
    const proofUrl = req.file.location || req.file.url;

    coinSymbol = coinSymbol.toUpperCase();

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const coin = await CoinConfig.findOne({ symbol: coinSymbol, status: 'active' });
    if (!coin) return res.status(400).json({ message: 'Coin not available for selling.' });

    const livePrice = (await getLivePrice(coinSymbol)) || coin.rateToNaira;
    if (!livePrice) return res.status(400).json({ message: `Unable to fetch price for ${coinSymbol}.` });

    // Calculate payout with discount
    const payout = Math.round(amount * livePrice * discountRate);

    // Freeze NGN balance
    if (user.balance < payout) {
      return res.status(400).json({ message: 'Insufficient balance to cover payout.' });
    }

    user.balance -= payout;
    user.frozenBalance = (user.frozenBalance || 0) + payout;
    await user.save();

    // Validate network if needed
    if (coin.hasNetwork) {
      if (!network) {
        return res.status(400).json({ message: 'Network is required for this coin.' });
      }
      const net = coin.networks.find(n => n.name.toLowerCase() === network.toLowerCase());
      if (!net) return res.status(400).json({ message: 'Invalid network selected for the coin.' });
    }

    // Determine payout send address/email
    let sendToAddressOrEmail = '';
    if (coinSendFrom === 'wallet') {
      if (coin.hasNetwork && network) {
        const net = coin.networks.find(n => n.name.toLowerCase() === network.toLowerCase());
        sendToAddressOrEmail = net.walletAddress;
      } else {
        sendToAddressOrEmail = user.walletAddress || '';
        if (!sendToAddressOrEmail) return res.status(400).json({ message: 'No wallet address found for user.' });
      }
    } else if (coinSendFrom === 'bybit') {
      sendToAddressOrEmail = coin.payoutEmails?.get('bybit') || user.bybitEmail || '';
      if (!sendToAddressOrEmail) return res.status(400).json({ message: 'No Bybit email configured for this coin or user.' });
    } else if (coinSendFrom === 'binance') {
      sendToAddressOrEmail = coin.payoutEmails?.get('binance') || user.binanceEmail || '';
      if (!sendToAddressOrEmail) return res.status(400).json({ message: 'No Binance email configured for this coin or user.' });
    } else {
      return res.status(400).json({ message: 'Invalid coin send source selected.' });
    }

    // Save transaction
    const transaction = new Transaction({
      user: userId,
      type: 'sell',
      amount,
      pricePerCoin: livePrice * discountRate,
      totalValue: payout,
      currency: 'NGN',
      status: 'submitted',
      description: `Sell ${amount} ${coinSymbol} via ${payoutDestination}`,
      coinSymbol,
      network: network || null,
      payoutDestination,
      coinSendFrom,
      sendToAddressOrEmail,
      proof: proofUrl,
    });

    await transaction.save();

    // Send emails
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

    return res.status(200).json({
      message: 'Sell order submitted successfully and pending approval.',
      transaction,
      sendToAddressOrEmail,
    });
  } catch (error) {
    console.error('Sell order error:', error);
    return res.status(500).json({ message: 'Server error while submitting sell order.' });
  }
};

module.exports = {
  calculatePayout,
  submitSell,
};
