const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // User Info
  firstName: { type: String, required: true },
  thirdName: { type: String },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  countryCode: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  profileImage: { type: String, default: '' },
  verificationCode: { type: String },
  isVerified: { type: Boolean, default: false },
  referralCode: { type: String, unique: true, sparse: true }, 
  referedBy: { type: String, default: null },

  // KYC
  KycData: {
    type: {
      type: String,
      enum: ['passport', 'driver_license', 'national_id'],
      required: false
    },
    idNumber: { type: String },
    imageUrl: { type: String },
    selfieImageUrl: { type: String },
    submittedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }
  },

  // Bank Info
  bankDetails: {
    accountNumber: { type: String },
    accountName: { type: String },
    bankName: { type: String },
    bankVerified: { type: Boolean, default: false },
    submittedAt: { type: Date, default: Date.now }
  },

  // Wallet
  balance: { type: Number, default: 0 },
  frozenBalance: { type: Number, default: 0 },
  totalDeposited: { type: Number, default: 0 },
  totalWithdrawn: { type: Number, default: 0 },

  // OTP
  otp: {
    code: String,
    otpExpires: Date
  },

  // Password Reset
  resetToken: String,
  resetTokenExpires: Date,

  // Notifications
  notifications: [{
    type: String,
    message: String,
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  }],
  // phone info

  // System Flags
  isActive: { type: Boolean, default: true },
  isAdmin: { type: Boolean, default: false },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
