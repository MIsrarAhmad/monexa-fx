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
  MINIMUM_YIELD_BALANCE,
  WITHDRAWAL_GRACE_PERIOD_HOURS,
} from '../config/constants.js';

export const calculateInvestmentYield = (investmentBalance) => {
  if (investmentBalance < MINIMUM_YIELD_BALANCE) return 0;
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
      const completedFirstGracePeriod = userB.hasUsedGracePeriod || (
        userB.firstDepositAt
        && Date.now() - new Date(userB.firstDepositAt).getTime() >= WITHDRAWAL_GRACE_PERIOD_HOURS * 60 * 60 * 1000
      );

      if (isBalanceEligible && completedFirstGracePeriod) {
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

          ref.hasTriggeredInitialBonus = true;
          ref.isPassiveEligible = true;
          ref.totalEarnedFromUser += REFERRAL_DIRECT_BONUS_FLAT;
          await ref.save();

          console.log(`✅ [Referral System] Unlocked $50 direct bonus for referrer ${ref.referrer} at end of Grace Period 1!`);
        }
      }
    }
  }
};

// Process testing yields across all eligible active accounts
export const processDailyYields = async () => {
  console.log('--- Starting Testing Yield Processing ---');

  try {
    // Fetch all user wallets
    const allWallets = await Wallet.find().populate('user');

    let processedCount = 0;
    let totalYieldDistributed = 0;

    for (const wallet of allWallets) {
      const firstDepositAt = wallet.user?.firstDepositAt
        ? new Date(wallet.user.firstDepositAt).getTime()
        : null;
      const activationPeriodIsActive = firstDepositAt !== null
        && Date.now() - firstDepositAt < WITHDRAWAL_GRACE_PERIOD_HOURS * 60 * 60 * 1000;
      if (activationPeriodIsActive) continue;

      const yieldAmount = calculateInvestmentYield(wallet.mainBalance);

      if (yieldAmount > 0) {
        wallet.profitBalance += yieldAmount;
        wallet.unwithdrawnProfitCounter += yieldAmount;
        await wallet.save();

        await Transaction.create({
          user: wallet.user._id,
          type: 'DAILY_YIELD',
          amount: yieldAmount,
          description: `Testing 1% yield on $${wallet.mainBalance.toFixed(2)} USDT investment balance`,
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

    console.log(
      `--- Testing Yield Processing Complete: ${processedCount} users paid ($${totalYieldDistributed.toFixed(2)} USDT) ---`
    );
    return { processedCount, totalYieldDistributed };
  } catch (error) {
    console.error('Error during testing yield calculation:', error.message);
    throw error;
  }
};

export const processDailyPassiveReferrals = async () => {
  try {
    const adminIds = await User.distinct('_id', { role: 'admin' });
    const activeReferrals = await Referral.find({
      referrer: { $nin: adminIds },
      isPassiveEligible: true,
    });
    let referralBonusCount = 0;

    for (const ref of activeReferrals) {
      const downstreamWallet = await Wallet.findOne({ user: ref.referredUser });

      if (downstreamWallet && downstreamWallet.mainBalance >= MINIMUM_INITIAL_DEPOSIT) {
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

          ref.totalEarnedFromUser += REFERRAL_DAILY_PASSIVE_USD;
          await ref.save();
          referralBonusCount++;
        }
      } else {
        ref.isPassiveEligible = false;
        await ref.save();
      }
    }

    console.log(`Daily passive referral processing complete: ${referralBonusCount} payouts issued.`);
    return { referralBonusCount };
  } catch (error) {
    console.error('Error during daily passive referral processing:', error.message);
    throw error;
  }
};