// src/controllers/adminController.js
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import Transaction from '../models/Transaction.js';
import Wallet from '../models/Wallet.js';
import Referral from '../models/Referral.js';
import User from '../models/User.js';
import SystemSettings from '../models/SystemSettings.js';
import { MINIMUM_INITIAL_DEPOSIT, WITHDRAWAL_LOCK_PROFIT_TARGET } from '../config/constants.js';
import { generateRefCode } from '../utils/generateRefCode.js';
import { isValidCountryCode } from '../utils/countries.js';
import { notifyUser, publishAnnouncement } from '../services/notificationService.js';
import { sendResolutionTransactionEmail } from '../utils/transactionEmail.js';
import { getWithdrawalEligibility } from '../utils/withdrawalRules.js';
import { DepositResolutionError, resolveDeposit } from '../services/depositResolution.js';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

// @route POST /api/admin/users/:userId/withdrawal-unlock
// @access Private/Admin
export const reviewLegacyWithdrawalUnlock = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { transactionId, reason } = req.body || {};
    if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(transactionId)
      || typeof reason !== 'string' || reason.trim().length < 10 || reason.trim().length > 300) {
      return res.status(400).json({ success: false, error: 'Provide valid user and transaction IDs and a review reason of 10 to 300 characters.' });
    }

    const transaction = await Transaction.findOneAndUpdate(
      {
        _id: transactionId, user: userId, type: 'WITHDRAWAL_REQUEST',
        status: 'COMPLETED', amount: { $gte: WITHDRAWAL_LOCK_PROFIT_TARGET },
        profitUnlockQualified: { $exists: false },
      },
      { $set: {
        profitUnlockQualified: true,
        profitUnlockReviewedBy: req.user._id,
        profitUnlockReviewedAt: new Date(),
        profitUnlockReviewReason: reason.trim(),
      } },
      { new: true, runValidators: true, timestamps: false }
    );
    if (!transaction) {
      return res.status(404).json({ success: false, error: 'No matching unreviewed completed withdrawal of at least $50 was found.' });
    }
    await notifyUser({
      userId,
      type: 'WITHDRAWAL_UNLOCKED',
      title: 'Withdrawal eligibility updated',
      message: 'Your previous withdrawal was reviewed. The $50 profit target will no longer be required for future requests. KYC, available balance and the 20% fee still apply.',
      url: '/dashboard',
    });
    return res.status(200).json({ success: true, message: 'Previous withdrawal reviewed and the profit target removed for future requests.' });
  } catch (error) {
    next(error);
  }
};

export const getAdminReferralCode = async (req, res, next) => {
  try {
    const admin = await User.findById(req.user._id);
    if (!admin || admin.role !== 'admin') {
      return res.status(404).json({ success: false, error: 'Admin account not found' });
    }

    if (!admin.adminReferralCode) {
      for (let attempt = 0; attempt < 5; attempt++) {
        const code = `ADMIN-${generateRefCode()}`;
        const codeExists = await User.exists({
          $or: [{ referralCode: code }, { adminReferralCode: code }],
        });
        if (codeExists) continue;

        try {
          const updatedAdmin = await User.findOneAndUpdate(
            { _id: admin._id, role: 'admin', adminReferralCode: { $exists: false } },
            { $set: { adminReferralCode: code } },
            { new: true, runValidators: true }
          );
          if (updatedAdmin) {
            admin.adminReferralCode = updatedAdmin.adminReferralCode;
            break;
          }
        } catch (error) {
          if (error.code !== 11000) throw error;
        }

        const refreshedAdmin = await User.findById(admin._id);
        if (refreshedAdmin?.adminReferralCode) {
          admin.adminReferralCode = refreshedAdmin.adminReferralCode;
          break;
        }
      }

      if (!admin.adminReferralCode) {
        throw new Error('Could not generate a unique admin referral code. Please try again.');
      }
    }

    res.status(200).json({
      success: true,
      data: { referralCode: admin.adminReferralCode },
    });
  } catch (error) {
    next(error);
  }
};

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
    const [userGroups, walletGroups, feeGroups, pendingWithdrawalsCount, pendingDepositsCount] = await Promise.all([
      User.aggregate([
        { $match: { role: 'user' } },
        { $lookup: { from: Wallet.collection.name, localField: '_id', foreignField: 'user', as: 'wallet' } },
        { $set: { main: { $ifNull: [{ $arrayElemAt: ['$wallet.mainBalance', 0] }, 0] } } },
        { $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          fullyInvestedCount: { $sum: { $cond: [{ $gte: ['$main', MINIMUM_INITIAL_DEPOSIT] }, 1, 0] } },
          partiallyInvestedCount: { $sum: { $cond: [{ $and: [{ $gt: ['$main', 0] }, { $lt: ['$main', MINIMUM_INITIAL_DEPOSIT] }] }, 1, 0] } },
          zeroInvestedCount: { $sum: { $cond: [{ $lte: ['$main', 0] }, 1, 0] } },
        } },
      ]),
      Wallet.aggregate([{ $group: {
        _id: null,
        totalLiquidity: { $sum: { $ifNull: ['$mainBalance', 0] } },
        totalProfitBalances: { $sum: { $ifNull: ['$profitBalance', 0] } },
        totalReferralBalances: { $sum: { $ifNull: ['$referralBalance', 0] } },
      } }]),
      Transaction.aggregate([
        { $match: { type: 'WITHDRAWAL_REQUEST', status: 'COMPLETED' } },
        { $group: { _id: null, total: { $sum: '$feeDeducted' } } },
      ]),
      Transaction.countDocuments({ type: 'WITHDRAWAL_REQUEST', status: 'PENDING' }),
      Transaction.countDocuments({ type: 'DEPOSIT', status: 'PENDING' }),
    ]);
    const users = userGroups[0] || {};
    const wallets = walletGroups[0] || {};
    const totalLiquidity = wallets.totalLiquidity || 0;
    const totalWithdrawableBalance = totalLiquidity + (wallets.totalProfitBalances || 0) + (wallets.totalReferralBalances || 0);

    res.status(200).json({
      success: true,
      data: {
        metrics: {
          totalUsers: users.totalUsers || 0,
          totalLiquidity,
          totalWithdrawableBalance,
          totalPlatformFeesCollected: feeGroups[0]?.total || 0,
          pendingWithdrawalsCount,
          pendingDepositsCount,
          segmentation: {
            fullyInvestedCount: users.fullyInvestedCount || 0,
            partiallyInvestedCount: users.partiallyInvestedCount || 0,
            zeroInvestedCount: users.zeroInvestedCount || 0,
          },
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

const getUserFinancialTotals = async (userIds) => {
  if (!userIds.length) return new Map();

  const totals = await Transaction.aggregate([
    {
      $match: {
        user: { $in: userIds },
        $or: [
          { type: 'DEPOSIT' },
          { type: 'DAILY_YIELD' },
          { type: { $in: ['REFERRAL_DIRECT_BONUS', 'REFERRAL_DAILY_PASSIVE'] } },
          { type: 'WITHDRAWAL_REQUEST' },
        ],
      },
    },
    {
      $group: {
        _id: '$user',
        depositPendingCount: { $sum: { $cond: [{ $and: [{ $eq: ['$type', 'DEPOSIT'] }, { $eq: ['$status', 'PENDING'] }] }, 1, 0] } },
        depositApprovedCount: { $sum: { $cond: [{ $and: [{ $eq: ['$type', 'DEPOSIT'] }, { $eq: ['$status', 'APPROVED'] }] }, 1, 0] } },
        depositCompletedCount: { $sum: { $cond: [{ $and: [{ $eq: ['$type', 'DEPOSIT'] }, { $eq: ['$status', 'COMPLETED'] }] }, 1, 0] } },
        depositRejectedCount: { $sum: { $cond: [{ $and: [{ $eq: ['$type', 'DEPOSIT'] }, { $eq: ['$status', 'REJECTED'] }] }, 1, 0] } },
        withdrawalPendingCount: { $sum: { $cond: [{ $and: [{ $eq: ['$type', 'WITHDRAWAL_REQUEST'] }, { $eq: ['$status', 'PENDING'] }] }, 1, 0] } },
        withdrawalApprovedCount: { $sum: { $cond: [{ $and: [{ $eq: ['$type', 'WITHDRAWAL_REQUEST'] }, { $eq: ['$status', 'APPROVED'] }] }, 1, 0] } },
        withdrawalCompletedCount: { $sum: { $cond: [{ $and: [{ $eq: ['$type', 'WITHDRAWAL_REQUEST'] }, { $eq: ['$status', 'COMPLETED'] }] }, 1, 0] } },
        withdrawalRejectedCount: { $sum: { $cond: [{ $and: [{ $eq: ['$type', 'WITHDRAWAL_REQUEST'] }, { $eq: ['$status', 'REJECTED'] }] }, 1, 0] } },
        totalDeposited: {
          $sum: {
            $cond: [
              { $and: [{ $eq: ['$type', 'DEPOSIT'] }, { $eq: ['$status', 'COMPLETED'] }] },
              '$amount',
              0,
            ],
          },
        },
        totalProfit: {
          $sum: { $cond: [{ $eq: ['$type', 'DAILY_YIELD'] }, '$amount', 0] },
        },
        totalReferralEarned: {
          $sum: {
            $cond: [
              { $in: ['$type', ['REFERRAL_DIRECT_BONUS', 'REFERRAL_DAILY_PASSIVE']] },
              '$amount',
              0,
            ],
          },
        },
        totalWithdrawn: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$type', 'WITHDRAWAL_REQUEST'] },
                  { $eq: ['$status', 'COMPLETED'] },
                ],
              },
              '$amount',
              0,
            ],
          },
        },
        totalPaidOut: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$type', 'WITHDRAWAL_REQUEST'] },
                  { $eq: ['$status', 'COMPLETED'] },
                ],
              },
              '$netAmount',
              0,
            ],
          },
        },
        totalWithdrawalFees: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$type', 'WITHDRAWAL_REQUEST'] },
                  { $eq: ['$status', 'COMPLETED'] },
                ],
              },
              '$feeDeducted',
              0,
            ],
          },
        },
        priorWithdrawalCount: {
          $sum: { $cond: [
            { $and: [
              { $eq: ['$type', 'WITHDRAWAL_REQUEST'] },
              { $in: ['$status', ['PENDING', 'COMPLETED']] },
            ] },
            1,
            0,
          ] },
        },
        qualifiedWithdrawalCount: {
          $sum: { $cond: [
            { $and: [
              { $eq: ['$type', 'WITHDRAWAL_REQUEST'] },
              { $eq: ['$status', 'COMPLETED'] },
              { $eq: ['$profitUnlockQualified', true] },
            ] },
            1,
            0,
          ] },
        },
      },
    },
  ]);

  return new Map(totals.map((entry) => [entry._id.toString(), entry]));
};

const getTransactionCounts = (totals, prefix) => ({
  pending: totals[`${prefix}PendingCount`] || 0,
  approved: totals[`${prefix}ApprovedCount`] || 0,
  completed: totals[`${prefix}CompletedCount`] || 0,
  rejected: totals[`${prefix}RejectedCount`] || 0,
});

// @route GET /api/admin/user-overview
// @access Private/Admin
export const getAdminUserOverview = async (req, res, next) => {
  try {
    const rawPage = typeof req.query.page === 'string' ? req.query.page : '';
    const page = /^\d{1,6}$/.test(rawPage) ? Math.max(1, Number(rawPage)) : 1;
    const pageSize = 25;
    const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : '';
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const statuses = ['ACTIVE_QUALIFIED', 'BELOW_THRESHOLD', 'UNINVESTED'];
    const status = statuses.includes(req.query.status) ? req.query.status : null;
    const match = { role: 'user' };
    if (search) {
      match.$or = [
        { name: { $regex: escapedSearch, $options: 'i' } },
        { email: { $regex: escapedSearch, $options: 'i' } },
      ];
    }

    const pipeline = [
      { $match: match },
      { $lookup: { from: Wallet.collection.name, localField: '_id', foreignField: 'user', as: 'wallet' } },
      { $set: { wallet: { $arrayElemAt: ['$wallet', 0] } } },
      { $set: {
        mainBalance: { $ifNull: ['$wallet.mainBalance', 0] },
        profitBalance: { $ifNull: ['$wallet.profitBalance', 0] },
        referralBalance: { $ifNull: ['$wallet.referralBalance', 0] },
        unwithdrawnProfitCounter: { $ifNull: ['$wallet.unwithdrawnProfitCounter', 0] },
        hasWallet: { $ne: [{ $ifNull: ['$wallet._id', null] }, null] },
      } },
      { $set: { status: { $switch: {
        branches: [
          { case: { $gte: ['$mainBalance', MINIMUM_INITIAL_DEPOSIT] }, then: 'ACTIVE_QUALIFIED' },
          { case: { $gt: ['$mainBalance', 0] }, then: 'BELOW_THRESHOLD' },
        ],
        default: 'UNINVESTED',
      } } } },
      ...(status ? [{ $match: { status } }] : []),
      { $sort: { name: 1, _id: 1 } },
      { $facet: {
        count: [{ $count: 'total' }],
        users: [
          { $skip: (page - 1) * pageSize },
          { $limit: pageSize },
          { $project: { _id: 1, name: 1, email: 1, country: 1, createdAt: 1, emailVerified: 1, mainBalance: 1, profitBalance: 1, referralBalance: 1, status: 1, kycStatus: 1, firstDepositAt: 1, hasUsedGracePeriod: 1, unwithdrawnProfitCounter: 1, hasWallet: 1 } },
        ],
      } },
    ];
    const [result] = await User.aggregate(pipeline);
    const users = result.users;
    const totalsByUser = await getUserFinancialTotals(users.map((user) => user._id));
    const total = result.count[0]?.total || 0;
    const now = Date.now();
    res.status(200).json({
      success: true,
      data: {
        users: users.map((user) => {
          const totals = totalsByUser.get(user._id.toString()) || {};
          const walletTotal = user.mainBalance + user.profitBalance + user.referralBalance;
          const eligibility = getWithdrawalEligibility({
            user, wallet: user, priorWithdrawalCount: totals.priorWithdrawalCount || 0,
            permanentlyUnlocked: totals.qualifiedWithdrawalCount > 0, now,
          });
          let withdrawalEligibility = 'ELIGIBLE';
          if (user.emailVerified === false) withdrawalEligibility = 'EMAIL_VERIFICATION_REQUIRED';
          else if (user.kycStatus !== 'APPROVED') withdrawalEligibility = 'KYC_REQUIRED';
          else if (!user.hasWallet) withdrawalEligibility = 'WALLET_MISSING';
          else if (!eligibility.canWithdraw) withdrawalEligibility = 'PROFIT_LOCKED';
          return {
            userId: user._id,
            name: user.name,
            email: user.email,
            country: isValidCountryCode(user.country) ? user.country : null,
            joinedAt: user.createdAt || null,
            totalDeposited: totals.totalDeposited || 0,
            totalWithdrawn: totals.totalWithdrawn || 0,
            depositCounts: getTransactionCounts(totals, 'deposit'),
            withdrawalCounts: getTransactionCounts(totals, 'withdrawal'),
            totalReferralEarned: totals.totalReferralEarned || 0,
            mainBalance: user.mainBalance,
            walletTotal,
            requestableGross: withdrawalEligibility === 'ELIGIBLE' ? Math.max(0, walletTotal) : 0,
            withdrawalEligibility,
            status: user.status,
            remainingToMinThreshold: Math.max(0, Number((MINIMUM_INITIAL_DEPOSIT - user.mainBalance).toFixed(2))),
          };
        }),
        pagination: { page, pageSize, total, pages: Math.ceil(total / pageSize) },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @route GET /api/admin/country-counts
// @access Private/Admin
export const getAdminCountryCounts = async (req, res, next) => {
  try {
    const groups = await User.aggregate([
      { $match: { role: 'user' } },
      { $group: { _id: '$country', count: { $sum: 1 } } },
    ]);
    const counts = new Map();
    for (const group of groups) {
      const country = isValidCountryCode(group._id) ? group._id : null;
      counts.set(country, (counts.get(country) || 0) + group.count);
    }
    const countries = [...counts].map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count || (a.country || '').localeCompare(b.country || ''));
    res.status(200).json({ success: true, data: { countries } });
  } catch (error) {
    next(error);
  }
};

// @route GET /api/admin/financial-ledger/users
// @access Private/Admin
export const getAdminFinancialLedgerUsers = async (req, res, next) => {
  try {
    const users = await User.find({ role: 'user' }).select('_id name email createdAt').sort({ name: 1 }).lean();
    const userIds = users.map((user) => user._id);
    const [wallets, totalsByUser] = await Promise.all([
      Wallet.find({ user: { $in: userIds } }).select('user mainBalance profitBalance referralBalance').lean(),
      getUserFinancialTotals(userIds),
    ]);
    const walletsByUser = new Map(wallets.map((wallet) => [wallet.user.toString(), wallet]));

    res.status(200).json({
      success: true,
      data: users.map((user) => {
        const wallet = walletsByUser.get(user._id.toString());
        const totals = totalsByUser.get(user._id.toString()) || {};
        return {
          userId: user._id,
          name: user.name,
          email: user.email,
          joinedAt: user.createdAt,
          totalDeposited: totals.totalDeposited || 0,
          totalProfit: totals.totalProfit || 0,
          totalReferralEarned: totals.totalReferralEarned || 0,
          totalWithdrawn: totals.totalWithdrawn || 0,
          totalPaidOut: totals.totalPaidOut || 0,
          totalWithdrawalFees: totals.totalWithdrawalFees || 0,
          depositCounts: getTransactionCounts(totals, 'deposit'),
          withdrawalCounts: getTransactionCounts(totals, 'withdrawal'),
          balances: {
            investment: wallet?.mainBalance || 0,
            profit: wallet?.profitBalance || 0,
            referral: wallet?.referralBalance || 0,
          },
        };
      }),
    });
  } catch (error) {
    next(error);
  }
};

// @route GET /api/admin/financial-ledger/users/:userId
// @access Private/Admin
export const getAdminUserFinancialLedger = async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, error: 'Invalid user ID.' });
    }

    const user = await User.findOne({ _id: userId, role: 'user' })
      .select('_id name email createdAt')
      .lean();
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const pageSize = 100;
    const type = typeof req.query.type === 'string' ? req.query.type : '';
    if (type && !['DEPOSIT', 'WITHDRAWAL_REQUEST'].includes(type)) {
      return res.status(400).json({ success: false, error: 'Invalid transaction type.' });
    }
    const transactionFilter = { user: user._id, ...(type ? { type } : {}) };
    const [wallet, totalsByUser, transactionCount, transactions] = await Promise.all([
      Wallet.findOne({ user: user._id })
        .select('mainBalance profitBalance referralBalance nextYieldAt yieldPaused')
        .lean(),
      getUserFinancialTotals([user._id]),
      Transaction.countDocuments(transactionFilter),
      Transaction.find(transactionFilter)
        .select('type amount originalSubmittedAmount depositCorrectionReason depositCorrectedAt depositCorrectedBy netAmount feeDeducted status description txHash paymentMethod createdAt')
        .populate('depositCorrectedBy', 'name email')
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
    ]);
    const totals = totalsByUser.get(user._id.toString()) || {};

    res.status(200).json({
      success: true,
      data: {
        user,
        summary: {
          totalDeposited: totals.totalDeposited || 0,
          totalProfit: totals.totalProfit || 0,
          totalReferralEarned: totals.totalReferralEarned || 0,
          totalWithdrawn: totals.totalWithdrawn || 0,
          totalPaidOut: totals.totalPaidOut || 0,
          totalWithdrawalFees: totals.totalWithdrawalFees || 0,
          depositCounts: getTransactionCounts(totals, 'deposit'),
          withdrawalCounts: getTransactionCounts(totals, 'withdrawal'),
          balances: {
            investment: wallet?.mainBalance || 0,
            profit: wallet?.profitBalance || 0,
            referral: wallet?.referralBalance || 0,
          },
          profitTimer: {
            threshold: MINIMUM_INITIAL_DEPOSIT,
            remainingToThreshold: Math.max(
              0,
              Number((MINIMUM_INITIAL_DEPOSIT - (wallet?.mainBalance || 0)).toFixed(2))
            ),
            isPaused: !wallet || wallet.mainBalance < MINIMUM_INITIAL_DEPOSIT || wallet.yieldPaused,
            nextProfitAt: wallet?.nextYieldAt || null,
          },
        },
        transactions,
        pagination: {
          page,
          pageSize,
          total: transactionCount,
          pages: Math.ceil(transactionCount / pageSize),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @route GET /api/admin/referral-rankings
// @access Private/Admin
export const getAdminReferralRankings = async (req, res, next) => {
  try {
    const referrals = await Referral.find()
      .populate('referrer', 'name email role')
      .populate('referredUser', 'name email createdAt')
      .lean();
    const referredUserIds = referrals
      .map((referral) => referral.referredUser?._id)
      .filter(Boolean);
    const depositTotals = referredUserIds.length
      ? await Transaction.aggregate([
        {
          $match: {
            user: { $in: referredUserIds },
            type: 'DEPOSIT',
            status: 'COMPLETED',
          },
        },
        {
          $group: {
            _id: '$user',
            totalDeposited: { $sum: '$amount' },
          },
        },
      ])
      : [];
    const depositsByUser = new Map(
      depositTotals.map((entry) => [entry._id.toString(), entry.totalDeposited])
    );
    const rankingsByReferrer = new Map();

    for (const referral of referrals) {
      const referrer = referral.referrer;
      const referredUser = referral.referredUser;
      if (!referrer || referrer.role !== 'user' || !referredUser) continue;

      const referrerId = referrer._id.toString();
      let ranking = rankingsByReferrer.get(referrerId);
      if (!ranking) {
        ranking = {
          userId: referrer._id,
          name: referrer.name,
          email: referrer.email,
          joinedReferralCount: 0,
          depositedReferralCount: 0,
          referralEarnings: 0,
          totalReferralDeposits: 0,
          members: [],
        };
        rankingsByReferrer.set(referrerId, ranking);
      }

      const memberDepositTotal = depositsByUser.get(referredUser._id.toString()) || 0;
      ranking.joinedReferralCount++;
      if (memberDepositTotal > 0) ranking.depositedReferralCount++;
      ranking.totalReferralDeposits += memberDepositTotal;
      ranking.referralEarnings += referral.totalEarnedFromUser || 0;
      ranking.members.push({
        userId: referredUser._id,
        name: referredUser.name,
        email: referredUser.email,
        joinedAt: referredUser.createdAt,
        deposited: memberDepositTotal > 0,
        totalDeposited: memberDepositTotal,
        referralEarned: referral.totalEarnedFromUser || 0,
      });
    }

    const rankings = [...rankingsByReferrer.values()]
      .sort((a, b) => (
        b.joinedReferralCount - a.joinedReferralCount
        || b.depositedReferralCount - a.depositedReferralCount
        || b.referralEarnings - a.referralEarnings
        || a.name.localeCompare(b.name)
      ))
      .map((ranking, index) => ({ rank: index + 1, ...ranking }));

    res.status(200).json({ success: true, data: rankings });
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

const addQueueContext = async (transactions) => {
  if (!transactions.length) return [];
  const contexts = await Transaction.aggregate([
    { $match: { _id: { $in: transactions.map((transaction) => transaction._id) } } },
    { $lookup: {
      from: Transaction.collection.name,
      let: { user: '$user', type: '$type', created: '$createdAt', id: '$_id' },
      pipeline: [
        { $match: { $expr: { $and: [
          { $eq: ['$user', '$$user'] },
          { $eq: ['$type', '$$type'] },
          { $or: [
            { $lt: ['$createdAt', '$$created'] },
            { $and: [{ $eq: ['$createdAt', '$$created'] }, { $lt: ['$_id', '$$id'] }] },
          ] },
        ] } } },
        { $group: {
          _id: null,
          earlierRequests: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ['$status', 'REJECTED'] }, 1, 0] } },
        } },
      ],
      as: 'history',
    } },
    { $project: { history: { $arrayElemAt: ['$history', 0] } } },
  ]);
  const byId = new Map(contexts.map((entry) => [String(entry._id), entry.history]));
  return transactions.map((transaction) => {
    const history = byId.get(String(transaction._id));
    if (!byId.has(String(transaction._id))) {
      throw new Error(`Queue context unavailable for transaction ${transaction._id}`);
    }
    return {
      ...transaction.toObject(),
      queueContext: {
        requestNumber: (history?.earlierRequests || 0) + 1,
        earlierCompleted: history?.completed || 0,
        earlierRejected: history?.rejected || 0,
      },
      reviewCapabilities: {
        correctAmount: transaction.type === 'DEPOSIT'
          && !transaction.merchantTradeNo && transaction.paymentMethod === 'TRC20'
          && Boolean(transaction.paymentProofUrl),
      },
    };
  });
};

// @desc    Get list of pending deposit proofs
// @route   GET /api/admin/deposits/pending
// @access  Private/Admin
export const getPendingDeposits = async (req, res, next) => {
  try {
    const pendingDeposits = await Transaction.find({ type: 'DEPOSIT', status: 'PENDING' })
      .populate('user', 'name email kycStatus createdAt')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      data: await addQueueContext(pendingDeposits),
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
    const { action, correctedAmount, correctionReason } = req.body;
    const transactionId = req.params.id;

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({ success: false, error: "Action must be 'APPROVE' or 'REJECT'" });
    }

    const { transaction, user, updatedMainBalance } = await resolveDeposit({
      transactionId, action, correctedAmount, correctionReason, reviewerId: req.user._id,
    });
    if (action === 'REJECT') {
      void sendResolutionTransactionEmail(transaction, 'rejected');
      await notifyUser({
        userId: transaction.user,
        type: 'DEPOSIT_REJECTED',
        title: 'Deposit proof needs attention',
        message: 'Your USDT deposit proof was not approved. Please check the submitted details and contact support if you need help.',
        url: '/transactions',
      });
      return res.status(200).json({
        success: true,
        message: 'Deposit proof rejected. User main balance was not altered.',
        data: transaction,
      });
    }

    const depositAmount = transaction.amount;
    void sendResolutionTransactionEmail(transaction, 'completed', user);
    await notifyUser({
      userId: transaction.user,
      type: 'DEPOSIT_APPROVED',
      title: 'Deposit credited successfully',
      message: `$${depositAmount.toFixed(2)} USDT has been credited to your investment balance.`,
      url: '/transactions',
    });

    res.status(200).json({
      success: true,
      message: `Deposit approved. Credited $${depositAmount} USDT to user main balance.`,
      data: {
        transaction,
        updatedMainBalance,
      },
    });
  } catch (error) {
    if (error instanceof DepositResolutionError) {
      return res.status(error.status === 409 ? 400 : error.status).json({ success: false, error: error.message });
    }
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
      .populate('user', 'name email kycStatus createdAt')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      data: await addQueueContext(pendingWithdrawals),
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

    // Action === 'REJECT' -> Restore the reserved wallet balances
    if (action === 'REJECT') {
      const previousMainBalance = wallet.mainBalance;
      const hasReservationBreakdown = transaction.reservedProfitBalance
        + transaction.reservedReferralBalance
        + transaction.reservedMainBalance > 0;

      if (hasReservationBreakdown) {
        wallet.profitBalance += transaction.reservedProfitBalance;
        wallet.referralBalance += transaction.reservedReferralBalance;
        wallet.mainBalance += transaction.reservedMainBalance;
      } else {
        wallet.profitBalance += transaction.amount;
      }

      if (previousMainBalance < MINIMUM_INITIAL_DEPOSIT && wallet.mainBalance >= MINIMUM_INITIAL_DEPOSIT) {
        const user = await User.findById(transaction.user);
        if (user) {
          user.firstDepositAt = new Date();
          await user.save();
        }
      }

      if (wallet.mainBalance >= MINIMUM_INITIAL_DEPOSIT && wallet.yieldPaused) {
        wallet.yieldPaused = false;
        wallet.nextYieldAt = new Date(Date.now() + DAY_IN_MS);
      }
      await wallet.save();

      transaction.status = 'REJECTED';
      await transaction.save();
      void sendResolutionTransactionEmail(transaction, 'rejected');
      await notifyUser({
        userId: transaction.user,
        type: 'WITHDRAWAL_REJECTED',
        title: 'Withdrawal request update',
        message: `Your $${transaction.amount.toFixed(2)} USDT withdrawal was not approved. Reserved funds have been restored to your wallet.`,
        url: '/transactions',
      });

      return res.status(200).json({
        success: true,
        message: 'Withdrawal rejected. Reserved funds have been restored to the wallet.',
        data: transaction,
      });
    }

    // Action === 'APPROVE'
    wallet.unwithdrawnProfitCounter = 0;
    wallet.lastWithdrawalAt = new Date();
    await wallet.save();
    const user = await User.findById(transaction.user);
    if (user) {
      user.firstDepositAt = new Date();
      await user.save();
    }

    transaction.status = 'COMPLETED';
    if (payoutTxHash) {
      transaction.txHash = payoutTxHash;
    }
    await transaction.save();
    void sendResolutionTransactionEmail(transaction, 'completed', user);
    await notifyUser({
      userId: transaction.user,
      type: 'WITHDRAWAL_APPROVED',
      title: 'Withdrawal request marked completed',
      message: `Your withdrawal request for $${transaction.netAmount.toFixed(2)} USDT net has been marked completed by an administrator.`,
      url: '/transactions',
    });

    res.status(200).json({
      success: true,
      message: `Withdrawal approved. Payout marked completed for net $${transaction.netAmount} USDT.`,
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
};

export const createAnnouncement = async (req, res, next) => {
  try {
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
    const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';

    if (title.length < 3 || title.length > 100 || message.length < 5 || message.length > 300) {
      return res.status(400).json({
        success: false,
        error: 'Announcement title must be 3–100 characters and message must be 5–300 characters.',
      });
    }

    const createdCount = await publishAnnouncement({ title, message });
    res.status(201).json({
      success: true,
      message: `Announcement added to ${createdCount} user inboxes. Mobile alerts go to devices that enabled them.`,
      data: { createdCount },
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