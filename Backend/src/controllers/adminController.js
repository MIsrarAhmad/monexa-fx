// src/controllers/adminController.js
import Transaction from '../models/Transaction.js';
import Wallet from '../models/Wallet.js';
import User from '../models/User.js';
import SystemSettings from '../models/SystemSettings.js';
import { MINIMUM_INITIAL_DEPOSIT } from '../config/constants.js';

// @desc    Get system-wide financial overview & pending request counts
// @route   GET /api/admin/stats
// @access  Private/Admin
export const getAdminStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'user' });
    const wallets = await Wallet.find({}).populate('user', 'name email createdAt role');

    const totalLiquidity = wallets.reduce((acc, w) => acc + (w.mainBalance || 0), 0);
    const totalProfitBalances = wallets.reduce((acc, w) => acc + (w.profitBalance || 0), 0);
    const totalReferralBalances = wallets.reduce((acc, w) => acc + (w.referralBalance || 0), 0);
    const totalWithdrawableBalance = totalLiquidity + totalProfitBalances + totalReferralBalances;

    const completedWithdrawals = await Transaction.find({
      type: 'WITHDRAWAL_REQUEST',
      status: 'COMPLETED',
    });
    const totalPlatformFeesCollected = completedWithdrawals.reduce(
      (acc, t) => acc + (t.feeDeducted || 0),
      0
    );

    let fullyInvestedCount = 0;
    let partiallyInvestedCount = 0;
    let zeroInvestedCount = 0;

    const userInvestmentDetails = [];

    for (const w of wallets) {
      if (!w.user || w.user.role === 'admin') continue;

      const mainBal = w.mainBalance || 0;
      let status = 'UNINVESTED';
      let remainingToMinThreshold = MINIMUM_INITIAL_DEPOSIT;

      if (mainBal >= MINIMUM_INITIAL_DEPOSIT) {
        status = 'ACTIVE_QUALIFIED';
        remainingToMinThreshold = 0;
        fullyInvestedCount++;
      } else if (mainBal > 0) {
        status = 'BELOW_THRESHOLD';
        remainingToMinThreshold = MINIMUM_INITIAL_DEPOSIT - mainBal;
        partiallyInvestedCount++;
      } else {
        zeroInvestedCount++;
      }

      userInvestmentDetails.push({
        userId: w.user._id,
        name: w.user.name,
        email: w.user.email,
        mainBalance: mainBal,
        totalWithdrawable: mainBal + (w.profitBalance || 0) + (w.referralBalance || 0),
        status,
        remainingToMinThreshold,
      });
    }

    const pendingWithdrawalsCount = await Transaction.countDocuments({
      type: 'WITHDRAWAL_REQUEST',
      status: 'PENDING',
    });

    const pendingDepositsCount = await Transaction.countDocuments({
      type: 'DEPOSIT',
      status: 'PENDING',
    });

    res.status(200).json({
      success: true,
      data: {
        metrics: {
          totalUsers,
          totalLiquidity,
          totalWithdrawableBalance,
          totalPlatformFeesCollected,
          pendingWithdrawalsCount,
          pendingDepositsCount,
          segmentation: {
            fullyInvestedCount,
            partiallyInvestedCount,
            zeroInvestedCount,
          },
        },
        userInvestmentDetails,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// DEPOSIT APPROVAL QUEUE (ADMIN)
// ==========================================

// @desc    Get list of pending deposit proofs
// @route   GET /api/admin/deposits/pending
// @access  Private/Admin
export const getPendingDeposits = async (req, res, next) => {
  try {
    const pendingDeposits = await Transaction.find({ type: 'DEPOSIT', status: 'PENDING' })
      .populate('user', 'name email kycStatus')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      data: pendingDeposits,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve or Reject a Deposit Proof Submission
// @route   PUT /api/admin/deposits/:id/action
// @access  Private/Admin
export const processDepositAction = async (req, res, next) => {
  try {
    const { action } = req.body;
    const transactionId = req.params.id;

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({ success: false, error: "Action must be 'APPROVE' or 'REJECT'" });
    }

    const transaction = await Transaction.findById(transactionId);
    if (!transaction || transaction.type !== 'DEPOSIT') {
      return res.status(404).json({ success: false, error: 'Pending deposit transaction not found' });
    }

    if (transaction.status !== 'PENDING') {
      return res.status(400).json({ success: false, error: `Deposit already ${transaction.status.toLowerCase()}` });
    }

    if (action === 'REJECT') {
      transaction.status = 'REJECTED';
      await transaction.save();
      return res.status(200).json({
        success: true,
        message: 'Deposit proof rejected. User main balance was not altered.',
        data: transaction,
      });
    }

    // Action === 'APPROVE'
    const depositAmount = transaction.amount;
    const wallet = await Wallet.findOne({ user: transaction.user });
    const user = await User.findById(transaction.user);

    if (!wallet) {
      return res.status(404).json({ success: false, error: 'User wallet record not found' });
    }

    const previousBalance = wallet.mainBalance;
    wallet.mainBalance += depositAmount;
    await wallet.save();

    if (previousBalance < MINIMUM_INITIAL_DEPOSIT && wallet.mainBalance >= MINIMUM_INITIAL_DEPOSIT) {
      if (user && !user.firstDepositAt) {
        user.firstDepositAt = new Date();
        await user.save();
      }
    }

    transaction.status = 'COMPLETED';
    await transaction.save();

    res.status(200).json({
      success: true,
      message: `Deposit approved. Credited $${depositAmount} USDT to user main balance.`,
      data: {
        transaction,
        updatedMainBalance: wallet.mainBalance,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// WITHDRAWAL APPROVAL QUEUE (ADMIN)
// ==========================================

// @desc    Get list of pending cashout requests
// @route   GET /api/admin/withdrawals/pending
// @access  Private/Admin
export const getPendingWithdrawals = async (req, res, next) => {
  try {
    const pendingWithdrawals = await Transaction.find({ type: 'WITHDRAWAL_REQUEST', status: 'PENDING' })
      .populate('user', 'name email kycStatus')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      data: pendingWithdrawals,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve or Reject a Withdrawal Cashout Request
// @route   PUT /api/admin/withdrawals/:id/action
// @access  Private/Admin
export const processWithdrawalAction = async (req, res, next) => {
  try {
    const { action, payoutTxHash } = req.body;
    const transactionId = req.params.id;

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({ success: false, error: "Action must be 'APPROVE' or 'REJECT'" });
    }

    const transaction = await Transaction.findById(transactionId);
    if (!transaction || transaction.type !== 'WITHDRAWAL_REQUEST') {
      return res.status(404).json({ success: false, error: 'Pending withdrawal transaction not found' });
    }

    if (transaction.status !== 'PENDING') {
      return res.status(400).json({ success: false, error: `Transaction already ${transaction.status.toLowerCase()}` });
    }

    const wallet = await Wallet.findOne({ user: transaction.user });
    if (!wallet) {
      return res.status(404).json({ success: false, error: 'User wallet record not found' });
    }

    // Action === 'REJECT' -> Refund reserved funds back to user profit balance
    if (action === 'REJECT') {
      wallet.profitBalance += transaction.amount;
      await wallet.save();

      transaction.status = 'REJECTED';
      await transaction.save();

      return res.status(200).json({
        success: true,
        message: 'Withdrawal rejected. Reserved funds refunded back to user profit balance.',
        data: transaction,
      });
    }

    // Action === 'APPROVE'
    wallet.unwithdrawnProfitCounter = 0;
    wallet.lastWithdrawalAt = new Date();
    await wallet.save();

    transaction.status = 'COMPLETED';
    if (payoutTxHash) {
      transaction.txHash = payoutTxHash;
    }
    await transaction.save();

    res.status(200).json({
      success: true,
      message: `Withdrawal approved. Payout marked completed for net $${transaction.netAmount} USDT.`,
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
};

// Maintenance Mode Controls
export const getMaintenanceStatus = async (req, res, next) => {
  try {
    let settings = await SystemSettings.findOne({});
    if (!settings) settings = await SystemSettings.create({});

    res.status(200).json({
      success: true,
      isMaintenanceMode: settings.isMaintenanceMode,
      message: settings.maintenanceMessage,
    });
  } catch (error) {
    next(error);
  }
};

export const toggleMaintenanceStatus = async (req, res, next) => {
  try {
    let settings = await SystemSettings.findOne({});
    if (!settings) settings = await SystemSettings.create({});

    settings.isMaintenanceMode = !settings.isMaintenanceMode;
    await settings.save();

    res.status(200).json({
      success: true,
      message: `System maintenance mode set to ${settings.isMaintenanceMode ? 'ON' : 'OFF'}`,
      isMaintenanceMode: settings.isMaintenanceMode,
    });
  } catch (error) {
    next(error);
  }
};