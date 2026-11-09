// src/controllers/withdrawalController.js
import Wallet from '../models/Wallet.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import {
  WITHDRAWAL_GRACE_PERIOD_HOURS,
  WITHDRAWAL_LOCK_PROFIT_TARGET,
  WITHDRAWAL_FEE_PERCENTAGE,
} from '../config/constants.js';

// @desc    Submit Cashout/Withdrawal Request (Sends to Admin Pending Queue)
// @route   POST /api/withdrawals/request
// @access  Private (KYC Approved Users Only)
export const requestWithdrawal = async (req, res, next) => {
  try {
    const { amount, binancePayId, payoutMethod, receiverAccount } = req.body;

    // Guard 1: Strict KYC Enforcement
    const user = await User.findById(req.user._id);
    if (!user || user.kycStatus !== 'APPROVED') {
      return res.status(403).json({
        success: false,
        error: 'KYC Verification required. Only verified accounts can request withdrawals.',
      });
    }

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, error: 'Please specify a valid withdrawal amount.' });
    }

    const targetAccount = receiverAccount || binancePayId;
    if (!targetAccount) {
      return res.status(400).json({ success: false, error: 'Please provide your Binance Pay ID or TRC20 receiving address.' });
    }

    const wallet = await Wallet.findOne({ user: req.user._id });
    if (!wallet) {
      return res.status(404).json({ success: false, error: 'Wallet record not found.' });
    }

    const withdrawAmount = Number(amount);
    const totalAvailable = wallet.profitBalance + wallet.referralBalance + wallet.mainBalance;

    // Guard 2: Total Balance Check
    if (withdrawAmount > totalAvailable) {
      return res.status(400).json({
        success: false,
        error: `Insufficient total balance. Available balance: $${totalAvailable.toFixed(2)} USDT.`,
      });
    }

    // Profit Lock Check ($50 profit target)
    const priorWithdrawalCount = await Transaction.countDocuments({
      user: req.user._id,
      type: 'WITHDRAWAL_REQUEST',
    });

    let isInGracePeriod = false;
    if (user.firstDepositAt) {
      const hoursElapsed = (new Date() - new Date(user.firstDepositAt)) / (1000 * 60 * 60);

      if (!user.hasUsedGracePeriod && priorWithdrawalCount === 0 && hoursElapsed < WITHDRAWAL_GRACE_PERIOD_HOURS) {
        isInGracePeriod = true;
      } else if (!user.hasUsedGracePeriod && hoursElapsed >= WITHDRAWAL_GRACE_PERIOD_HOURS) {
        user.hasUsedGracePeriod = true;
        await user.save();
      }
    }

    const profitTargetMet = wallet.unwithdrawnProfitCounter >= WITHDRAWAL_LOCK_PROFIT_TARGET;
    const canWithdraw = isInGracePeriod || profitTargetMet;

    if (!canWithdraw) {
      return res.status(400).json({
        success: false,
        error: `Withdrawal locked. Generate at least $${WITHDRAWAL_LOCK_PROFIT_TARGET} USDT in new profit to unlock withdrawals. Current: $${wallet.unwithdrawnProfitCounter.toFixed(2)} USDT.`,
      });
    }

    // Calculate 20% platform fee on server
    const feeDeducted = Number((withdrawAmount * WITHDRAWAL_FEE_PERCENTAGE).toFixed(2));
    const netAmount = Number((withdrawAmount - feeDeducted).toFixed(2));

    // Instant Balance Reservation (Prevents double spending while under admin review)
    let remainingToDeduct = withdrawAmount;

    if (wallet.profitBalance >= remainingToDeduct) {
      wallet.profitBalance -= remainingToDeduct;
      remainingToDeduct = 0;
    } else {
      remainingToDeduct -= wallet.profitBalance;
      wallet.profitBalance = 0;
    }

    if (remainingToDeduct > 0 && wallet.referralBalance >= remainingToDeduct) {
      wallet.referralBalance -= remainingToDeduct;
      remainingToDeduct = 0;
    } else if (remainingToDeduct > 0) {
      remainingToDeduct -= wallet.referralBalance;
      wallet.referralBalance = 0;
    }

    if (remainingToDeduct > 0) {
      wallet.mainBalance -= remainingToDeduct;
    }

    wallet.binancePayId = targetAccount;
    await wallet.save();

    // Create PENDING transaction entry
    const transaction = await Transaction.create({
      user: req.user._id,
      type: 'WITHDRAWAL_REQUEST',
      amount: withdrawAmount,
      feeDeducted,
      netAmount,
      paymentMethod: payoutMethod || 'BINANCE_PAY',
      status: 'PENDING',
      description: `Cashout request to ${targetAccount} (Net Payout: $${netAmount} USDT)`,
    });

    res.status(200).json({
      success: true,
      message: 'Withdrawal request submitted for Admin review. Reserved funds temporarily.',
      data: {
        transaction,
        netAmount,
        walletStatus: {
          mainBalance: wallet.mainBalance,
          profitBalance: wallet.profitBalance,
          referralBalance: wallet.referralBalance,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};