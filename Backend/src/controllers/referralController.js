// src/controllers/referralController.js
import Referral from '../models/Referral.js';
import Wallet from '../models/Wallet.js';

// @desc    Get user's referral network downlines & total referral earnings
// @route   GET /api/referrals/my-tree
// @access  Private
export const getMyReferralTree = async (req, res, next) => {
  try {
    const referrals = await Referral.find({ referrer: req.user._id })
      .populate('referredUser', 'name email createdAt firstDepositAt')
      .sort('-createdAt');

    // Enrich referral network records with active wallet balance information
    const formattedTree = await Promise.all(
      referrals.map(async (ref) => {
        const referredWallet = await Wallet.findOne({ user: ref.referredUser._id });
        const currentBalance = referredWallet ? referredWallet.mainBalance : 0;

        return {
          id: ref._id,
          user: {
            id: ref.referredUser._id,
            name: ref.referredUser.name,
            email: ref.referredUser.email,
            joinedAt: ref.referredUser.createdAt,
          },
          currentBalance,
          isQualifiedForPassive: ref.isPassiveEligible,
          hasPaidFlatDirectBonus: ref.hasTriggeredInitialBonus,
          totalEarnedFromThisUser: ref.totalEarnedFromUser,
        };
      })
    );

    const userWallet = await Wallet.findOne({ user: req.user._id });

    res.status(200).json({
      success: true,
      data: {
        referralCode: req.user.referralCode,
        referralBalance: userWallet ? userWallet.referralBalance : 0,
        totalReferredUsers: formattedTree.length,
        network: formattedTree,
      },
    });
  } catch (error) {
    next(error);
  }
};