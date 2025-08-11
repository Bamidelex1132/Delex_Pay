const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Deposit = require('../models/Deposit');
const DepositInfo = require('../models/DepositInfo');
const FeeConfig = require('../models/FeeConfig');
const CoinConfig = require('../models/CoinConfig'); 
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

const getCoins = async (req, res) => {
  try {
    const coins = await CoinConfig.find({ status: 'active' }).lean();

    const coinList = coins.map(coin => ({
      symbol: coin.symbol,
      name: coin.name,
      rateToNaira: coin.rateToNaira,
      hasNetwork: coin.requiresNetwork,
      networks: coin.availableNetworks || [],
      payoutInfo: coin.payoutInfo || {},
    }));

    res.status(200).json(coinList);
  } catch (err) {
    console.error('Error fetching coins:', err);
    res.status(500).json({ message: 'Server error fetching coins' });
  }
};

// Get user profile info including verified bank account info
const getUserProfile = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const user = await User.findById(req.user.id).select('-password').lean();
    if (!user) return res.status(404).json({ message: 'User not found' });

    let profileImageUrl = null;
    if (user.profileImage) {
      profileImageUrl = user.profileImage.startsWith('http')
        ? user.profileImage
        : `${req.protocol}://${req.get('host')}/uploads/${user.profileImage}`;
    }

    const bankInfo = {
      accountNumber: user.bankAccount || null,
      bankName: user.bankName || null,
      verified: !!user.bankVerified,
    };

    res.status(200).json({
      ...user,
      profileImage: profileImageUrl,
      bankInfo,
    });
  } catch (err) {
    console.error('User profile fetch error:', err);
    res.status(500).json({ message: 'Server error fetching profile' });
  }
};

const getDepositInfoByCurrency = async (req, res) => {
  try {
    const { currency } = req.params;

    if (!currency) {
      return res.status(400).json({ success: false, message: 'Currency is required' });
    }

    const depositInfo = await DepositInfo.findOne({ currency: currency.toUpperCase() });

    if (!depositInfo) {
      return res.status(404).json({ success: false, message: `No deposit info found for ${currency}` });
    }

    res.status(200).json({ success: true, data: depositInfo });
  } catch (error) {
    console.error('Error fetching deposit info:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const calculateUserBalance = async (userId) => {
  const transactions = await Transaction.find({ user: userId });

  let totalBalance = 0;
  let frozenBalance = 0;

  transactions.forEach((tx) => {
    totalBalance += tx.amount;
    if (tx.status === 'pending' || tx.status === 'frozen') {
      frozenBalance += tx.amount;
    }
  });

  const availableBalance = totalBalance - frozenBalance;
  return { totalBalance, frozenBalance, availableBalance };
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const { firstName, thirdName, lastName, phone } = req.body;

    user.firstName = firstName || user.firstName;
    user.middleName = thirdName || user.middleName;
    user.lastName = lastName || user.lastName;
    user.phone = phone || user.phone;

    if (req.file) {
      const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
      user.profileImage = imageUrl;
    }

    await user.save();

    res.json({ success: true, message: "Profile updated successfully", data: user });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getBasicUserData = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const user = await User.findById(req.user.id).select('-password');

    let profileImageUrl = null;
    if (user.profileImage) {
      profileImageUrl = user.profileImage.startsWith("http")
        ? user.profileImage
        : `${req.protocol}://${req.get("host")}/uploads/${user.profileImage}`;
    }

    const userData = {
      ...user._doc,
      profileImage: profileImageUrl,
    };

    const balanceData = await calculateUserBalance(user._id);

    res.status(200).json({ user: userData, balance: balanceData });
  } catch (err) {
    console.error('User data error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const getDashboardData = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select('balance frozenBalance firstName referralCode profileImage');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const availableBalance = user.balance - user.frozenBalance;

    const transactions = await Transaction.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json({
      firstName: user.firstName,
      balance: user.balance,
      frozenBalance: user.frozenBalance,
      availableBalance,
      referralCode: user.referralCode,
      profileImage: user.profileImage,
      transactions,
    });
  } catch (err) {
    console.error('Dashboard fetch error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const getUserTransactions = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const transactions = await Transaction.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json({ transactions });
  } catch (err) {
    console.error('Transaction fetch error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getBasicUserData,
  getDashboardData,
  getUserTransactions,
  updateProfile,
  calculateUserBalance,
  getDepositInfoByCurrency,
  getCoins,
  getUserProfile,
};
