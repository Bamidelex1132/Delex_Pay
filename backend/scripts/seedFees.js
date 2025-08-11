const mongoose = require('mongoose');
const Fee = require('../models/FeeConfig');
require('dotenv').config(); // make sure to load .env

// Connect to MongoDB once at the top
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ MongoDB connected for seeding fees.');
  seedFees(); // call after connection
})
.catch((err) => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

const fees = [
  { currency: 'NGN', rate: 0.03 },
  { currency: 'USD', rate: 0.02 },
  { currency: 'GHS', rate: 0.05 },
  { currency: 'USDT', rate: 0.01 },
];


const seedFees = async () => {
  try {
    await Fee.deleteMany(); // Optional: clear existing
    await Fee.insertMany(fees);
    console.log('✅ Dummy fees seeded successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding fees:', err);
    process.exit(1);
  }
};
