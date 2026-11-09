// src/controllers/depositController.js
import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import { MINIMUM_INITIAL_DEPOSIT } from '../config/constants.js';

// Helper function to calculate required minimum top-up
const getMinRequiredDeposit = (currentBalance) => {
  if (currentBalance > 0 && currentBalance < MINIMUM_INITIAL_DEPOSIT) {
    return MINIMUM_INITIAL_DEPOSIT - currentBalance;
  } else if (currentBalance >= MINIMUM_INITIAL_DEPOSIT) {
    return 1;
  }
  return MINIMUM_INITIAL_DEPOSIT;
};

// @desc    Submit Manual USDT Deposit Proof (Binance Pay / TRC20)
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

    if (!amount || !txHash) {
      return res.status(400).json({
        success: false,
        error: 'Please provide deposit amount and transaction hash / Binance Order ID (TxID).',
      });
    }

    if (!req.file || !req.file.path) {
      return res.status(400).json({
        success: false,
        error: 'Please upload a clear screenshot image proof of your transfer.',
      });
    }

    // Guard 2: Prevent duplicate TxID re-submissions
    const existingTx = await Transaction.findOne({ txHash });
    if (existingTx) {
      return res.status(400).json({
        success: false,
        error: 'This Transaction Hash / Order ID has already been submitted.',
      });
    }

    const wallet = await Wallet.findOne({ user: req.user._id });
    const currentBalance = wallet ? wallet.mainBalance : 0;
    const minRequired = getMinRequiredDeposit(currentBalance);

    if (Number(amount) < minRequired) {
      return res.status(400).json({
        success: false,
        error: `Amount below required minimum. Minimum deposit allowed for your account is $${minRequired} USDT.`,
      });
    }

    const paymentProofUrl = req.file.path; // Cloudinary Image URL

    const transaction = await Transaction.create({
      user: req.user._id,
      type: 'DEPOSIT',
      amount: Number(amount),
      txHash,
      paymentMethod: paymentMethod || 'BINANCE_PAY',
      paymentProofUrl,
      status: 'PENDING',
      description: description || `Deposit proof submitted via ${paymentMethod || 'USDT'}`,
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