// src/controllers/withdrawalController.js
import Wallet from '../models/Wallet.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import {
  MINIMUM_INITIAL_DEPOSIT,
  WITHDRAWAL_LOCK_PROFIT_TARGET,
  WITHDRAWAL_FEE_PERCENTAGE,
} from '../config/constants.js';
import { notifyUser } from '../services/notificationService.js';
import { sendTransactionEmail } from '../utils/transactionEmail.js';
import { expireWithdrawalGracePeriod, getWithdrawalEligibility } from '../utils/withdrawalRules.js';

// @desc    Submit Cashout/Withdrawal Request (Sends to Admin Pending Queue)
// @route   POST /api/withdrawals/request
// @access  Private (KYC Approved Users Only)
export const requestWithdrawal = async (req, res, next) => {
  try {
    const { amount, payoutMethod, receiverAccount } = req.body;

    // Guard 1: Strict KYC Enforcement
    const user = await User.findById(req.user._id);
    if (!user || user.kycStatus !== 'APPROVED') {
      return res.status(403).json({
        success: false,
        error: 'KYC Verification required. Only verified accounts can request withdrawals.',
      });
    }

    const withdrawAmount = Number(amount);
    if (!Number.isFinite(withdrawAmount) || withdrawAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Please specify a valid withdrawal amount.' });
    }

    if (payoutMethod !== 'TRC20') {
      return res.status(400).json({ success: false, error: 'Only USDT withdrawals through the TRON (TRC20) network are accepted.' });
    }

    const targetAccount = typeof receiverAccount === 'string' ? receiverAccount.trim() : '';
    if (!/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(targetAccount)) {
      return res.status(400).json({ success: false, error: 'Please provide a valid USDT TRC20 receiving address.' });
    }

    const wallet = await Wallet.findOne({ user: req.user._id });
    if (!wallet) {
      return res.status(404).json({ success: false, error: 'Wallet record not found.' });
    }

    const totalAvailable = wallet.profitBalance + wallet.referralBalance + wallet.mainBalance;

    // Guard 2: Total Balance Check
    if (withdrawAmount > totalAvailable) {
      return res.status(400).json({
        success: false,
        error: `Insufficient total balance. Available balance: $${totalAvailable.toFixed(2)} USDT.`,
      });
    }

    // Profit Lock Check ($50 profit target)
    const [priorWithdrawalCount, unlockedCount] = await Promise.all([
      Transaction.countDocuments({ user: req.user._id, type: 'WITHDRAWAL_REQUEST', status: { $in: ['PENDING', 'COMPLETED'] } }),
      Transaction.countDocuments({ user: req.user._id, type: 'WITHDRAWAL_REQUEST', status: 'COMPLETED', profitUnlockQualified: true }),
    ]);
    await expireWithdrawalGracePeriod(user);
    const eligibility = getWithdrawalEligibility({ user, wallet, priorWithdrawalCount, permanentlyUnlocked: unlockedCount > 0 });

    if (!eligibility.canWithdraw) {
      return res.status(400).json({
        success: false,
        error: `Withdrawal locked. Accumulate at least $${WITHDRAWAL_LOCK_PROFIT_TARGET} USDT in unwithdrawn profit and referral credits. Current: $${wallet.unwithdrawnProfitCounter.toFixed(2)} USDT.`,
      });
    }

    // Calculate 20% platform fee on server
    const feeDeducted = Number((withdrawAmount * WITHDRAWAL_FEE_PERCENTAGE).toFixed(2));
    const netAmount = Number((withdrawAmount - feeDeducted).toFixed(2));

    const previousMainBalance = wallet.mainBalance;
    let remainingToDeduct = withdrawAmount;
    let reservedProfitBalance = 0;
    let reservedReferralBalance = 0;
    let reservedMainBalance = 0;

    if (wallet.profitBalance >= remainingToDeduct) {
      reservedProfitBalance = remainingToDeduct;
      wallet.profitBalance -= remainingToDeduct;
      remainingToDeduct = 0;
    } else {
      remainingToDeduct -= wallet.profitBalance;
      reservedProfitBalance = wallet.profitBalance;
      wallet.profitBalance = 0;
    }

    if (remainingToDeduct > 0 && wallet.referralBalance >= remainingToDeduct) {
      reservedReferralBalance = remainingToDeduct;
      wallet.referralBalance -= remainingToDeduct;
      remainingToDeduct = 0;
    } else if (remainingToDeduct > 0) {
      remainingToDeduct -= wallet.referralBalance;
      reservedReferralBalance = wallet.referralBalance;
      wallet.referralBalance = 0;
    }

    if (remainingToDeduct > 0) {
      reservedMainBalance = remainingToDeduct;
      wallet.mainBalance -= remainingToDeduct;
    }

    if (wallet.mainBalance < MINIMUM_INITIAL_DEPOSIT) {
      wallet.yieldPaused = true;
      wallet.nextYieldAt = null;
    }

    wallet.trc20Address = targetAccount;
    await wallet.save();

    // Create PENDING transaction entry
    const transaction = await Transaction.create({
      user: req.user._id,
      type: 'WITHDRAWAL_REQUEST',
      amount: withdrawAmount,
      reservedProfitBalance,
      reservedReferralBalance,
      reservedMainBalance,
      profitUnlockQualified: eligibility.profitTargetMet && withdrawAmount >= WITHDRAWAL_LOCK_PROFIT_TARGET,
      feeDeducted,
      netAmount,
      paymentMethod: 'TRC20',
      receiverAddress: targetAccount,
      status: 'PENDING',
      description: `USDT TRC20 withdrawal request (Net Payout: $${netAmount} USDT)`,
    });
    void sendTransactionEmail(transaction, 'requested', user);
    await notifyUser({
      userId: req.user._id,
      type: 'WITHDRAWAL_PENDING',
      title: 'Withdrawal request received',
      message: `Your $${withdrawAmount.toFixed(2)} USDT TRC20 withdrawal request is awaiting admin review.`,
      url: '/transactions',
    });
    if (previousMainBalance >= MINIMUM_INITIAL_DEPOSIT && wallet.mainBalance < MINIMUM_INITIAL_DEPOSIT) {
      const shortfall = Math.max(0, Math.ceil((MINIMUM_INITIAL_DEPOSIT - wallet.mainBalance) * 100) / 100);
      await notifyUser({
        userId: req.user._id,
        type: 'YIELD_PAUSED',
        title: 'Profit paused while withdrawal is pending',
        message: `Your reserved withdrawal brought principal below $300. Profit is paused. Add $${shortfall.toFixed(2)} USDT to reach $300 and restart the 24-hour activation, or withdraw the remaining balance when eligible. Rejected requests restore reserved funds.`,
        url: '/dashboard',
      });
    }

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