import { WITHDRAWAL_GRACE_PERIOD_HOURS, WITHDRAWAL_LOCK_PROFIT_TARGET } from '../config/constants.js';

export const expireWithdrawalGracePeriod = async (user, now = Date.now()) => {
  if (user.firstDepositAt && !user.hasUsedGracePeriod
    && now - new Date(user.firstDepositAt).getTime() >= WITHDRAWAL_GRACE_PERIOD_HOURS * 60 * 60 * 1000) {
    user.hasUsedGracePeriod = true;
    await user.save();
  }
};

export const getWithdrawalEligibility = ({ user, wallet, priorWithdrawalCount, permanentlyUnlocked, now = Date.now() }) => {
  const hoursElapsed = user.firstDepositAt
    ? (now - new Date(user.firstDepositAt).getTime()) / (60 * 60 * 1000)
    : null;
  const isInGracePeriod = hoursElapsed !== null && !user.hasUsedGracePeriod
    && priorWithdrawalCount === 0 && hoursElapsed < WITHDRAWAL_GRACE_PERIOD_HOURS;
  const profitTargetMet = wallet.unwithdrawnProfitCounter >= WITHDRAWAL_LOCK_PROFIT_TARGET;
  return {
    isInGracePeriod,
    hoursRemainingInGrace: isInGracePeriod ? Math.max(0, WITHDRAWAL_GRACE_PERIOD_HOURS - hoursElapsed).toFixed(4) : 0,
    profitTargetMet,
    permanentlyUnlocked: Boolean(permanentlyUnlocked),
    canWithdraw: isInGracePeriod || profitTargetMet || Boolean(permanentlyUnlocked),
  };
};
