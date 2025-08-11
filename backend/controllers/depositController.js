
const DepositInfo = require('../models/DepositInfo');
const Transaction = require('../models/Transaction'); 
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;


const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});


exports.getOptions = async (req, res) => {
  try {
    const depositInfos = await DepositInfo.find();
    const currencies = depositInfos.map(info => ({
      code: info.currency,
      name: info.currency === "NGN" ? "Naira" : info.currency,
      symbol: info.currency === "NGN" ? "₦" : info.currency,
      minAmount: info.minAmount,
      maxAmount: info.maxAmount,
      feeRateBelowMin: info.feeRateBelowMin,
      feeRateAboveMin: info.feeRateAboveMin,
      bankName: info.bankName,
      accountName: info.accountName,
      accountNumber: info.accountNumber,
      instructions: info.instructions || ""
    }));

    const methods = [{ code: "bank", name: "Bank Transfer", enabled: true }];

    return res.json({ currencies, methods });
  } catch (err) {
    console.error("getOptions error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


exports.getDepositInfoByCurrency = async (req, res) => {
  try {
    const { currency } = req.params;
    if (!currency) return res.status(400).json({ message: "Currency required" });
    const info = await DepositInfo.findOne({ currency: currency.toUpperCase() });
    if (!info) return res.status(404).json({ message: "Deposit info not found for currency" });

    return res.json({
      currency: info.currency,
      bankName: info.bankName,
      accountName: info.accountName,
      accountNumber: info.accountNumber,
      minAmount: info.minAmount,
      maxAmount: info.maxAmount,
      feeRateBelowMin: info.feeRateBelowMin,
      feeRateAboveMin: info.feeRateAboveMin,
      instructions: info.instructions || ""
    });
  } catch (err) {
    console.error("getDepositInfoByCurrency error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.submitDeposit = async (req, res) => {
  try {

    const file = req.file;
    const { amount, currency, method } = req.body;

    if (!file) return res.status(400).json({ message: "Proof file is required" });
    if (!amount || !currency || !method) return res.status(400).json({ message: "Missing required fields" });

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) return res.status(400).json({ message: "Invalid amount" });

    const depositInfo = await DepositInfo.findOne({ currency: currency.toUpperCase() });
    if (!depositInfo) return res.status(400).json({ message: "Deposit info not available for currency" });

    const feeRate = numericAmount < depositInfo.minAmount ? depositInfo.feeRateBelowMin : depositInfo.feeRateAboveMin;
    const fee = parseFloat((numericAmount * feeRate).toFixed(2));
    const total = parseFloat((numericAmount + fee).toFixed(2));

    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id || decoded.userId || null;
      } catch (err) {
        console.warn("Invalid token provided; proceeding as guest");
      }
    }

    const txData = {
      user: userId,
      type: 'deposit',
      amount: numericAmount,
      currency: depositInfo.currency,
      method,
      fee,
      total,
      proofPath: file.path,
      status: 'pending',
      metadata: {
        depositInfoId: depositInfo._id,
        bankName: depositInfo.bankName,
        accountNumber: depositInfo.accountNumber,
        accountName: depositInfo.accountName
      }
    };

 
    const tx = new Transaction(txData);
    await tx.save();

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL || ADMIN_EMAIL,
      subject: `New Deposit Submitted — ${depositInfo.currency} ${numericAmount}`,
      text: `A new deposit has been submitted.\n\nAmount: ${numericAmount}\nCurrency: ${depositInfo.currency}\nMethod: ${method}\nFee: ${fee}\nTotal: ${total}\nUser: ${userId || 'guest'}\nTransaction ID: ${tx._id}\n\nPlease review in admin dashboard.`
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) console.error("Email error:", err);
      else console.log("Deposit notification sent:", info.response);
    });

    return res.json({ message: "Deposit submitted", transactionId: tx._id });
  } catch (err) {
    console.error("submitDeposit error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
