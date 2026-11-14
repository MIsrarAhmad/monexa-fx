// src/controllers/depositController.js
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import { MINIMUM_INITIAL_DEPOSIT, OFFICIAL_TRC20_DEPOSIT_ADDRESS } from '../config/constants.js';
import { notifyUser } from '../services/notificationService.js';
import { getMinimumDepositForBalance } from '../utils/depositRules.js';
import Wallet from '../models/Wallet.js';

// @desc    Submit Manual USDT TRC20 Deposit Proof
// @route   POST /api/deposits/submit
// @access  Private (KYC Approved Users Only)
export const submitManualDeposit = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    // Guard 1: Strict KYC Enforcement
    if (!user || user.kycStatus !== 'APPROVED') {
      return res.status(403).json({
        success: false,
        error: 'KYC Verification required. Please complete identity verification before depositing funds.',
      });
    }

    const { amount, txHash, paymentMethod, description } = req.body;

    if (paymentMethod !== 'TRC20') {
      return res.status(400).json({
        success: false,
        error: 'Only USDT deposits through the TRON (TRC20) network are accepted.',
      });
    }

    const depositAddress = process.env.TRC20_DEPOSIT_ADDRESS || OFFICIAL_TRC20_DEPOSIT_ADDRESS;
    if (!/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(depositAddress)) {
      return res.status(503).json({
        success: false,
        error: 'The official USDT TRC20 deposit address is not configured. Do not send funds.',
      });
    }

    const depositAmount = Number(amount);
    if (!Number.isFinite(depositAmount) || depositAmount <= 0 || typeof txHash !== 'string' || !txHash.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Please provide the deposit amount and TRC20 transaction ID (TxID).',
      });
    }

    if (!req.file || !req.file.path) {
      return res.status(400).json({
        success: false,
        error: 'Please upload a clear screenshot image proof of your transfer.',
      });
    }

    // Guard 2: Prevent duplicate TxID re-submissions
    const normalizedTxHash = txHash.trim();
    const existingTx = await Transaction.findOne({ txHash: normalizedTxHash });
    if (existingTx) {
      return res.status(400).json({
        success: false,
        error: 'This Transaction Hash / Order ID has already been submitted.',
      });
    }

    const wallet = await Wallet.findOne({ user: user._id });
    if (!wallet) {
      return res.status(404).json({
        success: false,
        error: 'Wallet not found. Please contact support before depositing.',
      });
    }

    const minimumDeposit = getMinimumDepositForBalance(wallet.mainBalance);
    if (depositAmount < minimumDeposit) {
      return res.status(400).json({
        success: false,
        error: wallet.mainBalance < MINIMUM_INITIAL_DEPOSIT
          ? `Deposit at least $${minimumDeposit.toFixed(2)} USDT to reach the $${MINIMUM_INITIAL_DEPOSIT} investment threshold.`
          : `Every deposit must be at least $${minimumDeposit.toFixed(2)} USDT.`,
      });
    }

    const paymentProofUrl = req.file.path; // Cloudinary Image URL

    const transaction = await Transaction.create({
      user: req.user._id,
      type: 'DEPOSIT',
      amount: depositAmount,
      minimumRequiredAtSubmission: minimumDeposit,
      txHash: normalizedTxHash,
      paymentMethod: 'TRC20',
      paymentProofUrl,
      status: 'PENDING',
      description: description || 'USDT TRC20 deposit proof submitted',
    });
    await notifyUser({
      userId: req.user._id,
      type: 'DEPOSIT_PENDING',
      title: 'Deposit proof received',
      message: `Your $${depositAmount.toFixed(2)} USDT deposit proof is in the review queue. We’ll notify you when it’s processed.`,
      url: '/transactions',
    });

    res.status(201).json({
      success: true,
      message: 'Deposit payment proof submitted successfully. Awaiting Admin verification.',
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
};