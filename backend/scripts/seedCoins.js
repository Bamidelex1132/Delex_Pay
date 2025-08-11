const mongoose = require('mongoose');
const CoinConfig = require('../models/CoinConfig');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/delexpay';

// Example coins data
const coins = [
  {
    name: 'Bitcoin',
    symbol: 'BTC',
    hasNetwork: true,
    networks: [
      { name: 'ERC20', walletAddress: '0xYourEthereumWalletAddress' },
      { name: 'BTC', walletAddress: '1YourBitcoinAddress' },
    ],
    rateToNaira: 15000000,
    minAmount: 0.0001,
    payoutEmails: { wallet: 'btc-payout@delexpay.com', bank: 'btc-bank@delexpay.com' },
    status: 'active',
  },
  {
    name: 'Tether',
    symbol: 'USDT',
    hasNetwork: true,
    networks: [
      { name: 'ERC20', walletAddress: '0xYourEthereumWalletAddress' },
      { name: 'TRC20', walletAddress: 'TXYourTronWalletAddress' },
    ],
    rateToNaira: 750,
    minAmount: 10,
    payoutEmails: { wallet: 'usdt-payout@delexpay.com', bank: 'usdt-bank@delexpay.com' },
    status: 'active',
  },
  {
    name: 'Pi Network',
    symbol: 'PI',
    hasNetwork: false,
    networks: [],
    rateToNaira: 300,
    minAmount: 1,
    payoutEmails: { wallet: 'pi-payout@delexpay.com' },
    status: 'active',
  },
  {
    name: 'Sidra',
    symbol: 'SID',
    hasNetwork: false,
    networks: [],
    rateToNaira: 500,
    minAmount: 1,
    payoutEmails: { wallet: 'sidra-payout@delexpay.com' },
    status: 'active',
  },
  {
    name: 'Ethereum',
    symbol: 'ETH',
    hasNetwork: true,
    networks: [
      { name: 'ERC20', walletAddress: '0xYourEthereumWalletAddress' },
    ],
    rateToNaira: 1100000,
    minAmount: 0.001,
    payoutEmails: { wallet: 'eth-payout@delexpay.com', bank: 'eth-bank@delexpay.com' },
    status: 'active',
  },
];

// Main async function
async function seed() {
  try {
    await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('MongoDB connected');

    // Remove all existing coins (optional, to avoid duplicates)
    await CoinConfig.deleteMany({});
    console.log('Old coins deleted');

    // Insert new coins
    await CoinConfig.insertMany(coins);
    console.log('Coins seeded successfully');

    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    mongoose.connection.close();
    process.exit(1);
  }
}

seed();
