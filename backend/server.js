const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
dotenv.config();
const app = express();

//  Middleware
app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));

//  MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
  });

// Route 
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const depositRoutes = require('./routes/depositRoutes');
const testRoutes = require('./routes/testRoutes');
const bankRoutes = require('./routes/bankRoutes');
const feeRoutes = require('./routes/feeRoutes');
const coinRoutes = require('./routes/coinRoutes');
const transactionRoutes = require('./routes/transaction');
const Transaction = require('./models/Transaction');
const sellRoutes = require('./routes/sell');




//  API 
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/deposit-info', depositRoutes);
app.use('/api/test', testRoutes);
app.use('/api/banks', bankRoutes);
app.use('/api/fee', feeRoutes);
app.use('/api/coins', coinRoutes);
app.use('/api/transaction', transactionRoutes);
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/deposit', depositRoutes); 
app.use('/api/transactions', transactionRoutes);
app.get('/api/transactions/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    res.json({ transaction });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});
app.use('/api', sellRoutes);

//  Static Uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads/receipt', express.static('uploads/receipt'));
app.use('/uploads/proof', express.static('uploads/proof'));
app.use('/uploads/profiles', express.static('uploads/profiles'));
app.use('/uploads/kyc', express.static('uploads/kyc'));

//  Frontend Static Path
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));
app.use('/assets', express.static(path.join(frontendPath, 'assets')));

//  Direct HTML Routes
app.get('/user-dashboard', (req, res) => {
  res.sendFile(path.join(frontendPath, 'user-dashboard', 'index.html'));
});

app.get('/admin-dashboard', (req, res) => {
  res.sendFile(path.join(frontendPath, 'admin', 'index.html'));
});

app.get('/frontend/verify.html', (req, res) => {
  res.sendFile(path.join(frontendPath, 'verify.html'));
});

app.get('/frontend/verify-code.html', (req, res) => {
  res.sendFile(path.join(frontendPath, 'verify-code.html'));
});

app.get('/reset-password.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/reset-password.html'));
});

//  Dynamic .html file routes
app.get('/:page.html', (req, res) => {
  const requestedFile = req.params.page + '.html';
  const fullPath = path.join(frontendPath, requestedFile);

  if (fs.existsSync(fullPath)) {
    return res.sendFile(fullPath);
  } else {
    return res.status(404).send('Page not found');
  }
});


//  Fallback for other static files
app.use((req, res, next) => {
  const requestedPath = path.join(frontendPath, req.path);
  if (fs.existsSync(requestedPath) && fs.lstatSync(requestedPath).isFile()) {
    return res.sendFile(requestedPath);
  }
  res.status(404).send('Not found');
});

//  Root route
app.get('/', (req, res) => {
  res.send('Delex Pay API is running...');
});
