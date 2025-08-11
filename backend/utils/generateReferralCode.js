const User = require('../models/User');

async function generateUniqueReferralCode() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const length = 8;

  let code, exists;

  do {
    code = Array.from({ length }, () =>
      characters.charAt(Math.floor(Math.random() * characters.length))
    ).join('');
    exists = await User.findOne({ refferralCode: code });
  } while (exists);

  return code;
}

module.exports = generateUniqueReferralCode;
