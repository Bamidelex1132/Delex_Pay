// scripts/addTestTransaction.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Transaction = require('../models/Transaction'); // Adjust path if needed

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connected to MongoDB');
})
.catch((err) => {
  console.error('MongoDB connection error:', err);
});

// Test user ID
const userId = '688d6549398a3b13ad82c2b2';

const testTransaction = new Transaction({
  user: userId,
  type: 'credit',
  amount: 20000,
  status: 'confirmed',
  description: 'Test deposit',
});

testTransaction.save()
  .then(() => {
    console.log('✅ Test transaction added successfully!');
    mongoose.disconnect();
  })
  .catch((err) => {
    console.error('❌ Error saving transaction:', err);
    mongoose.disconnect();
  });
