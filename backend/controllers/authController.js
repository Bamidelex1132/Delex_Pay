const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const sendEmail = require('../utils/nodemailer');
const useragent = require('useragent');
const BlacklistedToken = require('../models/BlacklistedToken');
const generateUniqueReferralCode = require('../utils/generateReferralCode');


if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  throw new Error('EMAIL_USER and EMAIL_PASS environment variables must be set');
}
const JWT_SECRET = process.env.JWT_SECRET;
const BASE_URL = process.env.BASE_URL || 'https://delex-pay.onrender.com';

const register = async (req, res) => {
  try {
    const {
      firstName, thirdName, lastName,
      email, password, confirmPassword,
      phone, countryCode, referedBy,
    } = req.body;

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const referralCode = await generateUniqueReferralCode();

    const newUser = new User({
      firstName,
      thirdName,
      lastName,
      email,
      password: hashedPassword,
      phone,
      countryCode,
      verificationCode,
      referedBy,
      isVerified: false,
      referralCode,
    });

    await newUser.save();

    await sendEmail(
      email,
      "Your Delex Pay Verification Code",
      `
      <div style="font-family: 'Segoe UI', sans-serif; background-color: #f4f7fa; padding: 30px; text-align: center; color: #1a1c2e;">
        <img src="https://delex-pay.com/assets/logo.png" alt="Delex Pay" width="120" style="margin-bottom: 20px;" />
        <h2 style="color: #0e0f1a;">Verify Your Email</h2>
        <p style="font-size: 16px; color: #555; max-width: 500px; margin: 0 auto;">
          Hi ${firstName}👋, your verification code for <strong>Delex Pay</strong> is:
        </p>
        <div style="font-size: 28px; font-weight: bold; background: #fff; color: #3b82f6; padding: 15px 30px; border-radius: 8px; display: inline-block; margin-top: 20px;">
          ${verificationCode}
        </div>
        <p style="margin-top: 25px; font-size: 14px; color: #999;">
          Enter this code in the app or website to complete your sign-up. This code will expire in 10 minutes.
        </p>
        <p style="margin-top: 20px; font-size: 13px; color: #aaa;">If you didn’t sign up for Delex Pay, you can safely ignore this email.</p>
      </div>
      `
    );

    res.status(201).json({
      message: 'Registration successful. Check your email to verify your account.',
      email,
      referralCode,
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Server error' });
  }
  
};

const resendVerificationCode = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (user.isverified) {
      return res.status(400).json({ message: 'User is already verified.' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.verificationCode = code;
    user.codeExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    await sendEmail(
      email,
      "Resend: Your Delex Pay Verification Code",
      `
      <div style="font-family: 'Segoe UI', sans-serif; background-color: #f4f7fa; padding: 30px; text-align: center; color: #1a1c2e;">
        <img src="https://delex-pay.com/assets/logo.png" alt="Delex Pay" width="120" style="margin-bottom: 20px;" />
        <h2 style="color: #0e0f1a;">Verify Your Email</h2>
        <p>Hi ${user.firstName}, your new verification code is:</p>
        <div style="font-size: 28px; font-weight: bold; background: #fff; color: #3b82f6; padding: 15px 30px; border-radius: 8px; display: inline-block; margin-top: 20px;">
          ${code}
        </div>
        <p style="margin-top: 20px; font-size: 14px;">This code will expire in 10 minutes.</p>
      </div>
      `
    );

    res.status(200).json({ message: 'Verification code resent.' });
  } catch (err) {
    console.error('Resend code error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};


const verifyCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ success: false, message: "User not found" });

    if (user.codeExpires && Date.now() > user.codeExpires) {
      return res.status(400).json({ success: false, message: "Verification code expired" });
    }

    if (user.isVerified) {
      return res.status(400).json({ success: false, message: "User already verified" });
    }

    if (user.verificationCode !== code) {
      return res.status(400).json({ success: false, message: "Invalid verification code" });
    }

    user.isVerified = true;
    user.verificationCode = undefined;
    user.codeExpires = undefined;
    await user.save();

    return res.status(200).json({ success: true, message: "Account verified" });
  } catch (err) {
    console.error("Verification error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Invalid email or password' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid email or password' });

    if (!user.isVerified) {
      return res.status(403).json({ message: 'Your email is not verified. Please check your inbox.' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    // ✅ Login location info
    const userAgent = useragent.parse(req.headers['user-agent']);
    const os = userAgent.os.toString();
    const browser = userAgent.toAgent();
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    let locationInfo = {};
    try {
      const geoRes = await axios.get(`http://ip-api.com/json/${ip}`);
      const { city, regionName, country } = geoRes.data;
      locationInfo = { city, region: regionName, country };
    } catch (e) {
      locationInfo = { city: 'Unknown', region: '', country: '' };
    }

    // ✅ Email notification
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"Delex Pay" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'New Login Alert',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; background-color: #f9f9f9; border-radius: 10px;">
          <div style="background-color: #0d6efd; padding: 15px; border-radius: 10px 10px 0 0; color: white; text-align: center;">
            <h2 style="margin: 0;">Delex Pay Login Alert</h2>
          </div>
                <img src="https://yourdomain.com/logo.png" alt="Delex Pay" style="height: 50px; margin-bottom: 10px;">
          <div style="padding: 20px; background-color: white;">
            <p>Hello <strong>${user.firstName || 'User'}</strong>,</p>
            <p>A new login to your <strong>Delex Pay</strong> account just occurred:</p>

            <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;"><strong>Time</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">${new Date().toLocaleString()}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;"><strong>IP Address</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">${ip}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;"><strong>Location</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">${locationInfo.city}, ${locationInfo.region}, ${locationInfo.country}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;"><strong>Operating System</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">${os}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;"><strong>Browser</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">${browser}</td>
              </tr>
            </table>

            <p style="margin-top: 20px; color: #dc3545;">
              If this wasn't you, please <strong>change your password</strong> immediately.
            </p>

            <p style="margin-top: 30px;">Thanks,<br>The Delex Pay Team</p>
          </div>
          <div style="background-color: #f1f1f1; padding: 10px; border-radius: 0 0 10px 10px; text-align: center; font-size: 12px; color: #888;">
            &copy; ${new Date().getFullYear()} Delex Pay. All rights reserved.
          </div>
        </div>`,
    };

    await transporter.sendMail(mailOptions);

    // ✅ Return full response
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        isVerified: user.isVerified,
        firstName: user.firstName,
        lastName: user.lastName,
        referralCode: user.referralCode,
        role: user.role,
        isAdmin: user.isAdmin
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "Email not found" });

    const token = crypto.randomBytes(20).toString("hex");
    user.resetToken = token;
    user.resetTokenExpires = Date.now() + 3600000;
    await user.save();

    const resetUrl = `https://delex-pay.onrender.com/reset-password.html?token=${token}`;

    const mailOptions = {
  to: user.email,
  from: process.env.EMAIL_USER,
  subject: "Password Reset - Delex Pay",
  html: `
    <div style="max-width: 600px; margin: auto; padding: 30px; font-family: Arial, sans-serif; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #f9f9f9;">
      <h2 style="color: #333;">Password Reset Request</h2>

      <p style="font-size: 16px; color: #555;">
        Hello <strong>${user.firstName}</strong>,
      </p>

      <p style="font-size: 16px; color: #555;">
        You requested to reset your password. Click the button below to proceed:
      </p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #007BFF; color: #ffffff; padding: 12px 20px; text-decoration: none; font-size: 16px; border-radius: 5px; display: inline-block;">
          Reset Password
        </a>
      </div>

      <p style="font-size: 14px; color: #999;">
        If the button doesn’t work, copy and paste the following link into your browser:
      </p>

      <p style="font-size: 14px; word-break: break-all; color: #007BFF;">
        ${resetUrl}
      </p>

      <p style="font-size: 14px; color: #999;">
        This link will expire in 1 hour.
      </p>

      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e0e0e0;" />

      <p style="font-size: 12px; color: #aaa;">
        If you didn’t request a password reset, you can safely ignore this email.
      </p>
    </div>
  `,
};
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail(mailOptions);
    res.json({ message: "Reset link sent to your email" });
  } catch (err) {
    console.error("Forgot Password Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const resetPassword = async (req, res) => {
  const { token, password } = req.body;
  try {
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpires: { $gt: Date.now() },
    });

    if (!user)
      return res.status(400).json({ message: "Invalid or expired token" });

    const hashedPassword = await bcrypt.hash(password, 12);
    user.password = hashedPassword;
    user.resetToken = undefined;
    user.resetTokenExpires = undefined;
    await user.save();

    // ✅ Send confirmation email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      to: user.email,
      from: process.env.EMAIL_USER,
      subject: "Password Reset Confirmation - Delex Pay",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background: #f9f9f9;">
          <h2 style="color: #333;">Password Changed Successfully</h2>
          <p style="font-size: 16px; color: #555;">Hello <strong>${user.firstName}</strong>,</p>
          <p style="font-size: 16px; color: #555;">This is a confirmation that your password was successfully changed.</p>
          <p style="font-size: 14px; color: #999;">If you did not perform this action, please contact our support immediately.</p>
          <hr style="margin-top: 20px;" />
          <p style="font-size: 12px; color: #aaa;">Delex Pay Team</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.json({ message: "Password reset successfully" });
  } catch (err) {
    console.error("Reset Password Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const logoutUser = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(400).json({ message: "No token provided" });

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await BlacklistedToken.create({ token, expiresAt });

    res.status(200).json({ message: "Logout successful" });
  } catch (err) {
    res.status(500).json({ message: "Logout failed", error: err.message });
  }
};

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  logoutUser,
  resendVerificationCode,
  verifyCode,
};
