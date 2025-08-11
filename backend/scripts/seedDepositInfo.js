const mongoose = require('mongoose');
const DepositInfo = require('../models/DepositInfo');
require('dotenv').config();
// Replace with your real MongoDB URI
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})

.then(() => console.log('MongoDB connected for seeding.'))
  .catch((err) => console.error('MongoDB error:', err));

const seedData = [
  {
    currency: 'NGN',
    accountName: 'Delex Pay Nigeria',
    accountNumber: '1234567890',
    bankName: 'Opay',
    minAmount: 1000,
    maxAmount: 500000,
    feeRateBelowMin: 0.04,
    feeRateAboveMin: 0.02
  },
  {
    currency: 'USD',
    accountName: 'Delex Pay Intl',
    accountNumber: '9876543210',
    bankName: 'Wise',
    minAmount: 10,
    maxAmount: 10000,
    feeRateBelowMin: 0.05,
    feeRateAboveMin: 0.025
  },
  {
    currency: 'GHS',
    accountName: 'Delex Pay Ghana',
    accountNumber: '1122334455',
    bankName: 'MTN MoMo',
    minAmount: 50,
    maxAmount: 20000,
    feeRateBelowMin: 0.03,
    feeRateAboveMin: 0.015
  }
];

(async () => {
  try {
    await DepositInfo.deleteMany({});
    await DepositInfo.insertMany(seedData);
    console.log('✅ DepositInfo seeded successfully!');
    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    mongoose.connection.close();
  }
})();
