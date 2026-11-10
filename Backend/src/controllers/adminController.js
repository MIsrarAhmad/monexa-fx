// src/controllers/adminController.js
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import Transaction from '../models/Transaction.js';
import Wallet from '../models/Wallet.js';
import Referral from '../models/Referral.js';
import User from '../models/User.js';
import SystemSettings from '../models/SystemSettings.js';
import { MINIMUM_INITIAL_DEPOSIT } from '../config/constants.js';

const getCloudinaryPublicId = (assetUrl, expectedFolder) => {
  let url;
  try {
    url = new URL(assetUrl);
  } catch {
    throw new Error('A stored user media URL is invalid; account deletion was stopped.');
  }

  if (url.hostname !== 'cloudinary.com' && !url.hostname.endsWith('.cloudinary.com')) {
    throw new Error('A stored user media URL is not a Cloudinary URL; account deletion was stopped.');
  }

  const uploadPath = url.pathname.split('/upload/')[1];
  if (!uploadPath) {
    throw new Error('A stored user media URL could not be resolved; account deletion was stopped.');
  }

  const pathSegments = uploadPath.split('/').filter(Boolean);
  const versionIndex = pathSegments.findIndex((segment) => /^v\d+$/.test(segment));
  const assetPath = (versionIndex >= 0 ? pathSegments.slice(versionIndex + 1) : pathSegments).join('/');
  const publicId = assetPath.replace(/\.[^/.]+$/, '');

  if (!publicId.startsWith(`${expectedFolder}/`)) {
    throw new Error('A stored user media asset is outside the expected folder; account deletion was stopped.');
  }

  return publicId;
};

const deleteCloudinaryAssets = async (assetUrls) => {
  const uniqueUrls = [...new Set(assetUrls.filter(Boolean))];
  if (uniqueUrls.length === 0) return;

  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary is not configured; account deletion was stopped before removing user records.');
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  });

  const assets = uniqueUrls.map((url) => {
    const expectedFolder = url.includes('/monexafx_kyc_documents/')
      ? 'monexafx_kyc_documents'
      : 'monexafx_deposit_proofs';
    return {
      publicId: getCloudinaryPublicId(url, expectedFolder),
      expectedFolder,
    };
  });

  for (const { publicId } of assets) {
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: 'image', invalidate: true });
    if (!['ok', 'not found'].includes(result.result)) {
      throw new Error(`Could not remove a stored user image (${result.result || 'unknown result'}); account records were not deleted.`);
    }
  }
};

// @desc    Get system-wide financial overview & pending request counts
// @route   GET /api/admin/stats
// @access  Private/Admin
export const getAdminStats = async (req, res, next) => {
  try {
    const users = await User.find({ role: 'user' }).select('_id name email');
    const totalUsers = users.length;
    const wallets = await Wallet.find({});
    const walletsByUserId = new Map(
      wallets.filter((wallet) => wallet.user).map((wallet) => [wallet.user.toString(), wallet])
    );

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

    for (const user of users) {
      const wallet = walletsByUserId.get(user._id.toString());
      const mainBal = wallet?.mainBalance || 0;
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
        userId: user._id,
        name: user.name,
        email: user.email,
        mainBalance: mainBal,
        totalWithdrawable: mainBal + (wallet?.profitBalance || 0) + (wallet?.referralBalance || 0),
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

// @desc    Permanently delete a user and their linked account data
// @route   DELETE /api/admin/users/:userId
// @access  Private/Admin
export const permanentlyDeleteUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { confirmEmail } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, error: 'Invalid user ID.' });
    }

    const user = await User.findById(userId);
    if (!user || user.role !== 'user') {
      return res.status(404).json({ success: false, error: 'Regular user account not found.' });
    }

    if (user._id.equals(req.user._id)) {
      return res.status(400).json({ success: false, error: 'You cannot delete your own administrator account.' });
    }

    if (typeof confirmEmail !== 'string' || confirmEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
      return res.status(400).json({ success: false, error: 'The confirmation email does not match the user account.' });
    }

    const transactions = await Transaction.find({ user: user._id }).select('paymentProofUrl');
    const assetUrls = [
      user.kycDetails?.idFrontUrl,
      user.kycDetails?.idBackUrl,
      user.kycDetails?.selfieUrl,
      ...transactions.map((transaction) => transaction.paymentProofUrl),
    ];

    await deleteCloudinaryAssets(assetUrls);

    await User.updateMany({ referredBy: user._id }, { $set: { referredBy: null } });
    const referrals = await Referral.deleteMany({
      $or: [{ referrer: user._id }, { referredUser: user._id }],
    });
    const wallet = await Wallet.deleteOne({ user: user._id });
    const transactionRecords = await Transaction.deleteMany({ user: user._id });
    const deletedUser = await User.deleteOne(
      { _id: user._id, email: user.email, role: 'user' }
    );

    if (deletedUser.deletedCount !== 1) {
      throw new Error('The user account could not be deleted. Some linked records may already have been removed; retry after checking the user directory.');
    }

    res.status(200).json({
      success: true,
      message: `User ${user.email} and linked account records were permanently deleted.`,
      data: {
        wallets: wallet.deletedCount,
        referrals: referrals.deletedCount,
        transactions: transactionRecords.deletedCount,
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