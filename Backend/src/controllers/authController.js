// Backend/src/controllers/authController.js
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import User, { USER_GENDERS } from '../models/User.js';
import Wallet from '../models/Wallet.js';
import Referral from '../models/Referral.js';
import generateToken from '../utils/generateTokens.js';
import { generateRefCode } from '../utils/generateRefCode.js';
import { sendEmail } from '../services/emailService.js';
import { passwordResetEmailTemplate, verificationEmailTemplate } from '../utils/emailTemplates.js';
import { isValidPassword, PASSWORD_REQUIREMENTS } from '../utils/passwordPolicy.js';
import { isValidCountryCode } from '../utils/countries.js';
import { isValidDateOfBirth } from '../utils/dateOfBirth.js';

const createVerificationToken = () => {
  const token = crypto.randomBytes(32).toString('hex');
  return {
    token,
    hash: crypto.createHash('sha256').update(token).digest('hex'),
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
  };
};

const sendVerificationEmail = async (user, token) => {
  const verificationUrl = new URL('/verify-email', process.env.FRONTEND_URL || 'https://monexafx.com');
  verificationUrl.searchParams.set('token', token);
  const delivery = sendEmail({
    to: user.email,
    subject: 'Verify your MonexaFX email address',
    html: verificationEmailTemplate(user.name, verificationUrl.toString()),
  });
  let timeout;
  try {
    return await Promise.race([
      delivery,
      new Promise((resolve) => {
        timeout = setTimeout(() => {
          console.error('Verification email delivery did not finish within 10 seconds.');
          resolve(false);
        }, 10000);
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res, next) => {
  try {
    const { name, fatherName, gender, dateOfBirth, country, email, password, referralCode } = req.body;

    if (typeof name !== 'string' || !name.trim() || name.trim().length > 100 ||
        typeof fatherName !== 'string' || !fatherName.trim() || fatherName.trim().length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a name and father name of up to 100 characters each',
      });
    }
    if (!USER_GENDERS.includes(gender)) {
      return res.status(400).json({ success: false, error: 'Please provide a valid gender' });
    }
    if (!isValidDateOfBirth(dateOfBirth)) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid date of birth in YYYY-MM-DD format that is not in the future',
      });
    }
    if (!isValidCountryCode(country)) {
      return res.status(400).json({ success: false, error: 'Please provide a valid ISO alpha-2 country code' });
    }
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ success: false, error: 'Please provide a valid email address' });
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

    const userExists = await User.findOne({ email: normalizedEmail });
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

    const verification = createVerificationToken();
    const user = await User.create({
      name: name.trim(),
      fatherName: fatherName.trim(),
      gender,
      dateOfBirth,
      country,
      email: normalizedEmail,
      emailVerified: false,
      emailVerificationToken: verification.hash,
      emailVerificationExpires: verification.expires,
      password: hashedPassword,
      referralCode: newRefCode,
      referredBy: referrerUser ? referrerUser._id : null,
    });

    await Wallet.create({
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

    const emailSent = await sendVerificationEmail(user, verification.token);
    res.status(201).json({
      success: true,
      message: emailSent
        ? 'Registration successful. Please verify your email before signing in.'
        : 'Account created, but verification email delivery could not be confirmed. Please request another email if it does not arrive.',
      data: { email: user.email, verificationRequired: true, verificationEmailSent: emailSent },
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

    if (user.emailVerified === false) {
      return res.status(403).json({
        success: false,
        error: 'Please verify your email address before signing in.',
        code: 'EMAIL_NOT_VERIFIED',
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
          country: user.country || null,
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

// @desc    Verify a new account's email using a single-use token
// @route   POST /api/auth/verify-email
export const verifyEmail = async (req, res, next) => {
  try {
    const token = req.body.token;
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
      return res.status(400).json({ success: false, error: 'This verification link is invalid or has expired. Please request a new one.' });
    }
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOneAndUpdate(
      { emailVerified: false, emailVerificationToken: hash, emailVerificationExpires: { $gt: new Date() } },
      { $set: { emailVerified: true }, $unset: { emailVerificationToken: 1, emailVerificationExpires: 1 } },
      { new: true }
    );
    if (!user) {
      return res.status(400).json({ success: false, error: 'This verification link is invalid or has expired. Please request a new one.' });
    }
    return res.status(200).json({ success: true, message: 'Email verified successfully. You can now sign in.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Resend a verification email for a new account
// @route   POST /api/auth/resend-verification
export const resendVerification = async (req, res, next) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, error: 'Please provide a valid email address.' });
    }
    const verification = createVerificationToken();
    const user = await User.findOneAndUpdate(
      { email, emailVerified: false },
      { $set: { emailVerificationToken: verification.hash, emailVerificationExpires: verification.expires } },
      { new: true }
    );
    if (user && !(await sendVerificationEmail(user, verification.token))) {
      return res.status(503).json({ success: false, error: 'Verification email delivery could not be confirmed. Please try again later if it does not arrive.' });
    }
    return res.status(200).json({
      success: true,
      message: 'If this address belongs to an unverified account, a verification email has been sent.',
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
          fatherName: user.fatherName || null,
          gender: user.gender || null,
          dateOfBirth: user.dateOfBirth || null,
          country: user.country || null,
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