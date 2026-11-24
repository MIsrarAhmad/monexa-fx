import Wallet from '../models/Wallet.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import {
  MINIMUM_INITIAL_DEPOSIT,
  WITHDRAWAL_LOCK_PROFIT_TARGET,
  WITHDRAWAL_FEE_PERCENTAGE,
} from '../config/constants.js';
import { getMinimumDepositForBalance } from '../utils/depositRules.js';
import { expireWithdrawalGracePeriod, getWithdrawalEligibility } from '../utils/withdrawalRules.js';

// @desc    Get live user wallet details & audit stats
// @route   GET /api/wallet/me
// @access  Private
export const getMyWallet = async (req, res, next) => {
  try {
    const wallet = await Wallet.findOne({ user: req.user._id });
    if (!wallet) {
      return res.status(404).json({ success: false, error: 'Wallet not found' });
    }

    res.status(200).json({
      success: true,
      data: wallet,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get full list of user transactions with filtering
// @route   GET /api/wallet/transactions
// @access  Private
export const getTransactions = async (req, res, next) => {
  try {
    const { type } = req.query;
    const filter = { user: req.user._id };

    if (type && type !== 'ALL') {
      filter.type = type;
    }

    const transactions = await Transaction.find(filter).sort('-createdAt');

    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Return minimum deposit and current yield threshold status
// @route   GET /api/wallet/topup-info
// @access  Private
export const getTopUpInfo = async (req, res, next) => {
  try {
    const wallet = await Wallet.findOne({ user: req.user._id });
    const currentBalance = wallet ? wallet.mainBalance : 0;

    res.status(200).json({
      success: true,
      data: {
        currentMainBalance: currentBalance,
        minimumRequiredThreshold: MINIMUM_INITIAL_DEPOSIT,
        minRequiredDeposit: getMinimumDepositForBalance(currentBalance),
        isThresholdMet: currentBalance >= MINIMUM_INITIAL_DEPOSIT,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get withdrawal eligibility status, grace period state, and fee breakdown
// @route   GET /api/wallet/withdraw-info
// @access  Private
export const getWithdrawalInfo = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const wallet = await Wallet.findOne({ user: req.user._id });

    if (!wallet) {
      return res.status(404).json({ success: false, error: 'Wallet not found' });
    }

    const [priorWithdrawalCount, unlockedCount] = await Promise.all([
      Transaction.countDocuments({ user: req.user._id, type: 'WITHDRAWAL_REQUEST', status: { $in: ['PENDING', 'COMPLETED'] } }),
      Transaction.countDocuments({ user: req.user._id, type: 'WITHDRAWAL_REQUEST', status: 'COMPLETED', profitUnlockQualified: true }),
    ]);
    await expireWithdrawalGracePeriod(user);
    const eligibility = getWithdrawalEligibility({ user, wallet, priorWithdrawalCount, permanentlyUnlocked: unlockedCount > 0 });

    res.status(200).json({
      success: true,
      data: {
        mainBalance: wallet.mainBalance,
        profitBalance: wallet.profitBalance,
        unwithdrawnProfitCounter: wallet.unwithdrawnProfitCounter,
        referralBalance: wallet.referralBalance,
        trc20Address: wallet.trc20Address,
        withdrawalRules: {
          hasUsedGracePeriod: user.hasUsedGracePeriod || priorWithdrawalCount > 0,
          profitLockTarget: WITHDRAWAL_LOCK_PROFIT_TARGET,
          ...eligibility,
          platformFeePercentage: WITHDRAWAL_FEE_PERCENTAGE * 100,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};