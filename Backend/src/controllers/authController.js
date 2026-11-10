// Backend/src/controllers/authController.js
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import User from '../models/User.js';
import Wallet from '../models/Wallet.js';
import Referral from '../models/Referral.js';
import generateToken from '../utils/generateTokens.js';
import { generateRefCode } from '../utils/generateRefCode.js';
import { sendEmail } from '../services/emailService.js';
import { passwordResetEmailTemplate, welcomeEmailTemplate } from '../utils/emailTemplates.js';
import { isValidPassword, PASSWORD_REQUIREMENTS } from '../utils/passwordPolicy.js';

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, referralCode } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide name, email, and password',
      });
    }
    if (!isValidPassword(password)) {
      return res.status(400).json({
        success: false,
        error: PASSWORD_REQUIREMENTS,
      });
    }

    const normalizedReferralCode =
      typeof referralCode === 'string' ? referralCode.trim().toUpperCase() : '';
    if (!normalizedReferralCode) {
      return res.status(400).json({
        success: false,
        error: 'Please provide an invitation code',
      });
    }

    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({
        success: false,
        error: 'An account with this email already exists',
      });
    }

    const referrerUser = await User.findOne({
      $or: [
        { referralCode: normalizedReferralCode },
        { adminReferralCode: normalizedReferralCode },
      ],
    });
    if (!referrerUser) {
      return res.status(400).json({
        success: false,
        error: 'Invalid referral code provided',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    let newRefCode = generateRefCode();
    let codeIsUnique = await User.findOne({
      $or: [
        { referralCode: newRefCode },
        { adminReferralCode: newRefCode },
      ],
    });
    while (codeIsUnique) {
      newRefCode = generateRefCode();
      codeIsUnique = await User.findOne({
        $or: [
          { referralCode: newRefCode },
          { adminReferralCode: newRefCode },
        ],
      });
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      referralCode: newRefCode,
      referredBy: referrerUser ? referrerUser._id : null,
    });

    const wallet = await Wallet.create({
      user: user._id,
      mainBalance: 0,
      profitBalance: 0,
      unwithdrawnProfitCounter: 0,
      referralBalance: 0,
    });

    if (referrerUser && referrerUser.role !== 'admin') {
      await Referral.create({
        referrer: referrerUser._id,
        referredUser: user._id,
        hasTriggeredInitialBonus: false,
        isPassiveEligible: false,
      });
    }

    const token = generateToken(user._id);

    // Send Welcome Email asynchronously
    sendEmail({
      to: user.email,
      subject: 'Welcome to TradeYield - Account Active',
      html: welcomeEmailTemplate(user.name, user.referralCode),
    }).catch((err) => console.error('Background welcome email error:', err.message));

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          referralCode: user.referralCode,
          hasUsedGracePeriod: user.hasUsedGracePeriod,
          firstDepositAt: user.firstDepositAt || null,
        },
        wallet: {
          mainBalance: wallet.mainBalance,
          profitBalance: wallet.profitBalance,
          unwithdrawnProfitCounter: wallet.unwithdrawnProfitCounter,
          referralBalance: wallet.referralBalance,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide email and password',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    const wallet = await Wallet.findOne({ user: user._id });
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          referralCode: user.referralCode,
          hasUsedGracePeriod: user.hasUsedGracePeriod,
          firstDepositAt: user.firstDepositAt || null,
        },
        wallet: {
          mainBalance: wallet ? wallet.mainBalance : 0,
          profitBalance: wallet ? wallet.profitBalance : 0,
          unwithdrawnProfitCounter: wallet ? wallet.unwithdrawnProfitCounter : 0,
          referralBalance: wallet ? wallet.referralBalance : 0,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send a password reset link when the email belongs to an account
// @route   POST /api/auth/forgot-password
// @access  Public
export const requestPasswordReset = async (req, res, next) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Please provide your email address',
      });
    }

    const user = await User.findOne({ email });
    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
      const resetExpires = new Date(Date.now() + 30 * 60 * 1000);

      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            passwordResetToken: resetTokenHash,
            passwordResetExpires: resetExpires,
          },
        }
      );

      const frontendUrl = process.env.FRONTEND_URL || 'https://monexafx.com';
      const resetUrl = new URL('/reset-password', frontendUrl);
      resetUrl.searchParams.set('token', resetToken);

      sendEmail({
        to: user.email,
        subject: 'Reset your MONEXA FX password',
        html: passwordResetEmailTemplate(user.name, resetUrl.toString()),
      }).then(async (emailSent) => {
        if (!emailSent) {
          await User.updateOne(
            { _id: user._id, passwordResetToken: resetTokenHash },
            { $unset: { passwordResetToken: 1, passwordResetExpires: 1 } }
          );
        }
      }).catch((error) => {
        console.error('Password reset email processing failed:', error.message);
      });
    }

    res.status(200).json({
      success: true,
      message: 'If an account exists for that email, a password reset link will be sent.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset a password using a one-time email token
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (typeof token !== 'string' || !token) {
      return res.status(400).json({
        success: false,
        error: 'A valid password reset link is required',
      });
    }
    if (!isValidPassword(password)) {
      return res.status(400).json({
        success: false,
        error: PASSWORD_REQUIREMENTS,
      });
    }

    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.findOneAndUpdate(
      {
        passwordResetToken: resetTokenHash,
        passwordResetExpires: { $gt: new Date() },
      },
      {
        $set: {
          password: hashedPassword,
          passwordChangedAt: new Date(),
        },
        $unset: { passwordResetToken: 1, passwordResetExpires: 1 },
      },
      { runValidators: true }
    );

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'This password reset link is invalid or has expired. Please request a new one.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Password reset successfully. You can now sign in with your new password.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get logged in user profile & live wallet
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const wallet = await Wallet.findOne({ user: req.user._id });

    res.status(200).json({
      success: true,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          referralCode: user.referralCode,
          hasUsedGracePeriod: user.hasUsedGracePeriod,
          firstDepositAt: user.firstDepositAt || null,
        },
        wallet: {
          mainBalance: wallet ? wallet.mainBalance : 0,
          profitBalance: wallet ? wallet.profitBalance : 0,
          unwithdrawnProfitCounter: wallet ? wallet.unwithdrawnProfitCounter : 0,
          referralBalance: wallet ? wallet.referralBalance : 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};