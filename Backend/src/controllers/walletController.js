import Wallet from '../models/Wallet.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import {
  MINIMUM_INITIAL_DEPOSIT,
  WITHDRAWAL_GRACE_PERIOD_HOURS,
  WITHDRAWAL_LOCK_PROFIT_TARGET,
  WITHDRAWAL_FEE_PERCENTAGE,
} from '../config/constants.js';
import { getMinimumDepositForBalance } from '../utils/depositRules.js';

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

    const priorWithdrawalCount = await Transaction.countDocuments({
      user: req.user._id,
      type: 'WITHDRAWAL_REQUEST',
      status: { $in: ['PENDING', 'COMPLETED'] },
    });

    let isInGracePeriod = false;
    let hoursRemainingInGrace = 0;

    if (user.firstDepositAt) {
      const now = new Date();
      const firstDepositTime = new Date(user.firstDepositAt);
      const hoursElapsed = (now - firstDepositTime) / (1000 * 60 * 60);

      if (!user.hasUsedGracePeriod && priorWithdrawalCount === 0 && hoursElapsed < WITHDRAWAL_GRACE_PERIOD_HOURS) {
        isInGracePeriod = true;
        hoursRemainingInGrace = Math.max(0, WITHDRAWAL_GRACE_PERIOD_HOURS - hoursElapsed).toFixed(4);
      } else if (!user.hasUsedGracePeriod && hoursElapsed >= WITHDRAWAL_GRACE_PERIOD_HOURS) {
        user.hasUsedGracePeriod = true;
        await user.save();
      }
    }

    const profitTargetMet = wallet.unwithdrawnProfitCounter >= WITHDRAWAL_LOCK_PROFIT_TARGET;
    const canWithdraw = isInGracePeriod || profitTargetMet;

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
          isInGracePeriod,
          hoursRemainingInGrace,
          profitLockTarget: WITHDRAWAL_LOCK_PROFIT_TARGET,
          profitTargetMet,
          canWithdraw,
          platformFeePercentage: WITHDRAWAL_FEE_PERCENTAGE * 100,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};