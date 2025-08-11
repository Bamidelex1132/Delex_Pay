const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const existingAdmin = await User.findOne({ email: 'toheebdikko@gmail.com' });
    if (existingAdmin) {
      console.log('Admin already exists');
      return;
    }

    const hashedPassword = await bcrypt.hash('Toheeb2003', 12);

    const admin = new User({
      firstName: 'Toheeb',
      thirdName: 'Bamidele',
      lastName: 'Dikko',
      email: 'toheebdikko@gmail.com',
      phone: '+2349032207517',
      countryCode: 'NG',
      password: hashedPassword,
      role: 'admin',
      isVerified: true,
    });

    await admin.save();
    console.log('✅ Admin created successfully');
  } catch (err) {
    console.error('❌ Error creating admin:', err);
  } finally {
    mongoose.connection.close();
  }
}

createAdmin();
