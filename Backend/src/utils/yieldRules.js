import { MINIMUM_INITIAL_DEPOSIT, REFERRAL_DAILY_PASSIVE_USD } from '../config/constants.js';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const decimalParts = (amount) => {
  const [mantissa, exponent = '0'] = amount.toString().split('e');
  const [whole, fractional = ''] = mantissa.split('.');
  return { digits: BigInt(whole + fractional), exponent: Number(exponent) - fractional.length };
};

export const calculateDailyYield = (mainBalance, profitBalance) => {
  if (!Number.isFinite(mainBalance) || mainBalance < 0
    || !Number.isFinite(profitBalance) || profitBalance < 0) {
    throw new Error('Invalid balance for daily yield calculation');
  }
  if (mainBalance < MINIMUM_INITIAL_DEPOSIT) return 0;
  const main = decimalParts(mainBalance);
  const profit = decimalParts(profitBalance);
  const exponent = Math.min(main.exponent, profit.exponent, 0);
  // Sum decimal representations exactly so floating-point addition cannot round up a step.
  const total = main.digits * 10n ** BigInt(main.exponent - exponent)
    + profit.digits * 10n ** BigInt(profit.exponent - exponent);
  const steps = total / (100n * 10n ** BigInt(-exponent));
  if (steps > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Daily yield exceeds safe calculation limits');
  return Number(steps);
};

export const getMonthlyProfitForecast = ({ mainBalance, profitBalance, hasWallet, yieldPaused, nextYieldAt, credited, now }) => {
  const date = new Date(now);
  const starts = Array.from({ length: 5 }, (_, index) => (
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + index, 1)
  ));
  const months = starts.slice(0, 4).map((start) => ({
    month: new Date(start).toISOString().slice(0, 7),
    estimated: null,
  }));
  let status = 'AVAILABLE';

  if (!hasWallet) status = 'WALLET_MISSING';
  else if (!Number.isFinite(mainBalance) || mainBalance < 0
    || !Number.isFinite(profitBalance) || profitBalance < 0) status = 'BALANCE_UNAVAILABLE';
  else if (mainBalance < MINIMUM_INITIAL_DEPOSIT) {
    months.forEach((month) => { month.estimated = 0; });
  } else {
    const next = nextYieldAt ? new Date(nextYieldAt).getTime() : NaN;
    if (yieldPaused || !Number.isFinite(next)) status = 'SCHEDULE_UNAVAILABLE';
    else {
      let projectedProfit = profitBalance;
      const amounts = [0, 0, 0, 0];
      for (let due = Math.max(now, next); due < starts[4]; due += DAY_IN_MS) {
        const index = starts.findIndex((start, position) => position < 4 && due >= start && due < starts[position + 1]);
        if (index >= 0) {
          const daily = calculateDailyYield(mainBalance, projectedProfit);
          amounts[index] += daily;
          projectedProfit += daily;
        }
      }
      months.forEach((month, index) => { month.estimated = amounts[index]; });
    }
  }

  const creditedAmount = Number(credited.toFixed(2));
  const current = months[0];
  return {
    status,
    current: {
      month: current.month,
      credited: creditedAmount,
      estimatedTotal: current.estimated === null ? null : Number((creditedAmount + current.estimated).toFixed(2)),
    },
    nextMonths: months.slice(1),
    nextThreeTotal: status === 'AVAILABLE'
      ? Number(months.slice(1).reduce((sum, month) => sum + month.estimated, 0).toFixed(2))
      : null,
  };
};

export const getMonthlyPassiveReferralForecast = ({ referrals, credited, now }) => {
  const date = new Date(now);
  const starts = Array.from({ length: 5 }, (_, index) => (
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + index, 1)
  ));
  const counts = [0, 0, 0, 0];
  let status = 'AVAILABLE';
  let eligibleCount = 0;
  for (const referral of referrals) {
    if (!referral.hasTriggeredInitialBonus) continue;
    if (!Number.isFinite(referral.mainBalance) || referral.mainBalance < 0) {
      status = 'BALANCE_UNAVAILABLE';
      break;
    }
    if (referral.mainBalance < MINIMUM_INITIAL_DEPOSIT) continue;
    eligibleCount++;
    let next = now + DAY_IN_MS;
    if (referral.isPassiveEligible && referral.lastPassivePayoutAt) {
      const last = new Date(referral.lastPassivePayoutAt).getTime();
      if (!Number.isFinite(last)) {
        status = 'SCHEDULE_UNAVAILABLE';
        break;
      }
      next = Math.max(now, last + DAY_IN_MS);
    }
    for (let due = next; due < starts[4]; due += DAY_IN_MS) {
      const index = starts.findIndex((start, position) => position < 4 && due >= start && due < starts[position + 1]);
      if (index >= 0) counts[index]++;
    }
  }
  const amounts = counts.map((count) => Number((count * REFERRAL_DAILY_PASSIVE_USD).toFixed(2)));
  const months = starts.slice(0, 4).map((start, index) => ({
    month: new Date(start).toISOString().slice(0, 7),
    estimated: status === 'AVAILABLE' ? amounts[index] : null,
  }));
  const creditedAmount = Number(credited.toFixed(2));
  return {
    status,
    eligibleCount: status === 'AVAILABLE' ? eligibleCount : null,
    current: {
      month: months[0].month,
      credited: creditedAmount,
      estimatedTotal: months[0].estimated === null ? null : Number((creditedAmount + months[0].estimated).toFixed(2)),
    },
    nextMonths: months.slice(1),
    nextThreeTotal: status === 'AVAILABLE' ? Number(amounts.slice(1).reduce((sum, amount) => sum + amount, 0).toFixed(2)) : null,
  };
};
