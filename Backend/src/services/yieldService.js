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
} from '../config/constants.js';

// Calculate tier floor yield on total withdrawable balance ($300-$399 = $3, $400-$499 = $4, $500-$599 = $5, etc.)
export const calculateTierYield = (totalWithdrawableBalance) => {
  if (totalWithdrawableBalance < MINIMUM_INITIAL_DEPOSIT) return 0;

  // Floor down to nearest $100 bracket based on total withdrawable capital
  const baseTier = Math.floor(totalWithdrawableBalance / 100) * 100;
  return baseTier * DAILY_YIELD_RATE;
};

// Check and trigger flat $50 direct referral bonuses upon completion of Grace Period 1
export const processPendingDirectReferrals = async () => {
  const pendingReferrals = await Referral.find({ hasTriggeredInitialBonus: false });

  for (const ref of pendingReferrals) {
    const userB = await User.findById(ref.referredUser);
    const walletB = await Wallet.findOne({ user: ref.referredUser });

    if (userB && walletB) {
      const isBalanceEligible = walletB.mainBalance >= MINIMUM_INITIAL_DEPOSIT;
      const completedFirstGracePeriod = userB.hasUsedGracePeriod || Boolean(userB.firstDepositAt);

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

// Process daily compounding returns across all eligible active accounts
export const processDailyYields = async () => {
  console.log('--- Starting Daily Compounding Yield & Referral Processing ---');

  try {
    // Fetch all user wallets
    const allWallets = await Wallet.find().populate('user');

    let processedCount = 0;
    let totalYieldDistributed = 0;

    for (const wallet of allWallets) {
      // Total withdrawable balance = Principal + Accumulated Yield + Referral Commissions
      const totalWithdrawable = wallet.mainBalance + wallet.profitBalance + wallet.referralBalance;

      // Yield is calculated on total withdrawable balance
      const yieldAmount = calculateTierYield(totalWithdrawable);

      if (yieldAmount > 0) {
        wallet.profitBalance += yieldAmount;
        wallet.unwithdrawnProfitCounter += yieldAmount;
        await wallet.save();

        await Transaction.create({
          user: wallet.user._id,
          type: 'DAILY_YIELD',
          amount: yieldAmount,
          description: `Daily 1% compounding yield on $${totalWithdrawable.toFixed(2)} USDT total withdrawable balance base`,
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
    const activeReferrals = await Referral.find({ isPassiveEligible: true });
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

    console.log(
      `--- Yield Processing Complete: ${processedCount} users paid ($${totalYieldDistributed.toFixed(
        2
      )} USDT), ${referralBonusCount} passive payouts issued ---`
    );
    return { processedCount, totalYieldDistributed, referralBonusCount };
  } catch (error) {
    console.error('Error during daily yield calculation:', error.message);
    throw error;
  }
};