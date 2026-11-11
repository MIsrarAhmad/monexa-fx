// Backend/src/services/yieldService.js
import Wallet from '../models/Wallet.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Referral from '../models/Referral.js';
import {
  DAILY_YIELD_RATE,
  REFERRAL_DIRECT_BONUS_FLAT,
  REFERRAL_DAILY_PASSIVE_USD,
  MINIMUM_INITIAL_DEPOSIT,
  WITHDRAWAL_GRACE_PERIOD_HOURS,
} from '../config/constants.js';
import { notifyUser } from './notificationService.js';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const calculateDailyYield = (investmentBalance) => {
  if (investmentBalance < MINIMUM_INITIAL_DEPOSIT) return 0;
  return Number((investmentBalance * DAILY_YIELD_RATE).toFixed(2));
};

// Check and trigger flat $50 direct referral bonuses upon completion of Grace Period 1
export const processPendingDirectReferrals = async () => {
  const adminIds = await User.distinct('_id', { role: 'admin' });
  const pendingReferrals = await Referral.find({
    referrer: { $nin: adminIds },
    hasTriggeredInitialBonus: false,
  });

  for (const ref of pendingReferrals) {
    const userB = await User.findById(ref.referredUser);
    const walletB = await Wallet.findOne({ user: ref.referredUser });

    if (userB && walletB) {
      const isBalanceEligible = walletB.mainBalance >= MINIMUM_INITIAL_DEPOSIT;
      const completedFirstGracePeriod = userB.firstDepositAt
        && Date.now() - new Date(userB.firstDepositAt).getTime() >= WITHDRAWAL_GRACE_PERIOD_HOURS * 60 * 60 * 1000;
      const withdrawalDuringHoldingPeriod = userB.firstDepositAt
        ? await Transaction.exists({
          user: userB._id,
          type: 'WITHDRAWAL_REQUEST',
          status: { $in: ['PENDING', 'COMPLETED'] },
          createdAt: { $gte: userB.firstDepositAt },
        })
        : true;

      if (isBalanceEligible && completedFirstGracePeriod && !withdrawalDuringHoldingPeriod) {
        const walletA = await Wallet.findOne({ user: ref.referrer });

        if (walletA) {
          walletA.referralBalance += REFERRAL_DIRECT_BONUS_FLAT;
          // Increment referrer's unwithdrawn profit counter so referral rewards assist in unlocking the next cashout
          walletA.unwithdrawnProfitCounter += REFERRAL_DIRECT_BONUS_FLAT;
          await walletA.save();

          await Transaction.create({
            user: ref.referrer,
            type: 'REFERRAL_DIRECT_BONUS',
            amount: REFERRAL_DIRECT_BONUS_FLAT,
            description: `Flat $50 direct referral reward credited upon referred user completing initial grace period hold`,
          });
          await notifyUser({
            userId: ref.referrer,
            type: 'REFERRAL_REWARD',
            title: 'Referral reward credited',
            message: '$50.00 USDT has been added to your referral balance.',
            url: '/referrals',
          });

          ref.hasTriggeredInitialBonus = true;
          ref.isPassiveEligible = true;
          ref.lastPassivePayoutAt = new Date();
          ref.totalEarnedFromUser += REFERRAL_DIRECT_BONUS_FLAT;
          await ref.save();

          console.log(`✅ [Referral System] Unlocked $50 direct bonus for referrer ${ref.referrer} at end of Grace Period 1!`);
        }
      }
    }
  }
};

// Process each user's 24-hour yield cycle and eligible referral payouts.
export const processDailyYields = async () => {
  try {
    const allWallets = await Wallet.find().populate('user');
    const now = new Date();
    const legacyWallets = allWallets.filter((wallet) => (
      wallet.user
      && wallet.mainBalance >= MINIMUM_INITIAL_DEPOSIT
      && !wallet.yieldPaused
      && !wallet.nextYieldAt
    ));
    const lastYieldTransactions = legacyWallets.length
      ? await Transaction.aggregate([
        {
          $match: {
            user: { $in: legacyWallets.map((wallet) => wallet.user._id) },
            type: 'DAILY_YIELD',
          },
        },
        { $sort: { createdAt: -1 } },
        { $group: { _id: '$user', createdAt: { $first: '$createdAt' } } },
      ])
      : [];
    const lastYieldByUser = new Map(
      lastYieldTransactions.map((transaction) => [String(transaction._id), transaction.createdAt])
    );

    let processedCount = 0;
    let totalYieldDistributed = 0;

    for (const wallet of allWallets) {
      if (!wallet.user) continue;

      if (wallet.mainBalance < MINIMUM_INITIAL_DEPOSIT) {
        if (!wallet.yieldPaused || wallet.nextYieldAt) {
          wallet.yieldPaused = true;
          wallet.nextYieldAt = null;
          await wallet.save();
        }
        continue;
      }

      if (wallet.yieldPaused) {
        wallet.yieldPaused = false;
        wallet.nextYieldAt = new Date(now.getTime() + DAY_IN_MS);
        await wallet.save();
        continue;
      }

      if (!wallet.nextYieldAt) {
        const lastYieldAt = lastYieldByUser.get(String(wallet.user._id));
        const baseline = lastYieldAt || wallet.user.firstDepositAt;
        wallet.nextYieldAt = baseline
          ? new Date(new Date(baseline).getTime() + DAY_IN_MS)
          : new Date(now.getTime() + DAY_IN_MS);
        await wallet.save();
      }

      if (now < wallet.nextYieldAt) continue;

      const yieldAmount = calculateDailyYield(wallet.mainBalance);

      if (yieldAmount > 0) {
        wallet.profitBalance += yieldAmount;
        wallet.unwithdrawnProfitCounter += yieldAmount;
        wallet.nextYieldAt = new Date(now.getTime() + DAY_IN_MS);
        await wallet.save();

        await Transaction.create({
          user: wallet.user._id,
          type: 'DAILY_YIELD',
          amount: yieldAmount,
          description: `Daily 1% yield on $${wallet.mainBalance.toFixed(2)} USDT qualifying investment balance`,
        });
        await notifyUser({
          userId: wallet.user._id,
          type: 'DAILY_YIELD',
          title: 'Your daily profit has been credited',
          message: `$${yieldAmount.toFixed(2)} USDT (1% of your qualifying investment balance) has been added to your profit balance.`,
          url: '/transactions',
        });

        if (wallet.user.firstDepositAt && !wallet.user.hasUsedGracePeriod) {
          await User.findByIdAndUpdate(wallet.user._id, { hasUsedGracePeriod: true });
        }

        processedCount++;
        totalYieldDistributed += yieldAmount;
      }
    }

    // Evaluate and payout qualifying $50 direct referral bonuses
    await processPendingDirectReferrals();

    // Process $0.20 daily passive referral payouts for active nodes
    const adminIds = await User.distinct('_id', { role: 'admin' });
    const activeReferrals = await Referral.find({
      referrer: { $nin: adminIds },
      hasTriggeredInitialBonus: true,
    });
    let referralBonusCount = 0;

    for (const ref of activeReferrals) {
      const downstreamWallet = await Wallet.findOne({ user: ref.referredUser });

      if (downstreamWallet && downstreamWallet.mainBalance >= MINIMUM_INITIAL_DEPOSIT) {
        if (!ref.isPassiveEligible) {
          ref.isPassiveEligible = true;
          ref.lastPassivePayoutAt = new Date();
          await ref.save();
          continue;
        }
        if (!ref.lastPassivePayoutAt) {
          ref.lastPassivePayoutAt = new Date();
          await ref.save();
          continue;
        }
        if (now.getTime() - new Date(ref.lastPassivePayoutAt).getTime() < DAY_IN_MS) continue;

        const referrerWallet = await Wallet.findOne({ user: ref.referrer });
        if (referrerWallet) {
          referrerWallet.referralBalance += REFERRAL_DAILY_PASSIVE_USD;
          referrerWallet.unwithdrawnProfitCounter += REFERRAL_DAILY_PASSIVE_USD;
          await referrerWallet.save();

          await Transaction.create({
            user: ref.referrer,
            type: 'REFERRAL_DAILY_PASSIVE',
            amount: REFERRAL_DAILY_PASSIVE_USD,
            description: `Daily passive referral bonus from active user node`,
          });
          await notifyUser({
            userId: ref.referrer,
            type: 'REFERRAL_REWARD',
            title: 'Referral income credited',
            message: `$${REFERRAL_DAILY_PASSIVE_USD.toFixed(2)} USDT has been added to your referral balance.`,
            url: '/referrals',
          });

          ref.totalEarnedFromUser += REFERRAL_DAILY_PASSIVE_USD;
          ref.lastPassivePayoutAt = now;
          await ref.save();
          referralBonusCount++;
        }
      } else {
        if (ref.isPassiveEligible || ref.lastPassivePayoutAt) {
          ref.isPassiveEligible = false;
          ref.lastPassivePayoutAt = null;
          await ref.save();
        }
      }
    }

    if (processedCount || referralBonusCount) {
      console.log(
        `24-hour processing complete: ${processedCount} users paid ($${totalYieldDistributed.toFixed(
          2
        )} USDT), ${referralBonusCount} passive payouts issued.`
      );
    }
    return { processedCount, totalYieldDistributed, referralBonusCount };
  } catch (error) {
    console.error('Error during daily yield calculation:', error.message);
    throw error;
  }
};