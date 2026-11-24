import { DAILY_YIELD_RATE, MINIMUM_INITIAL_DEPOSIT } from '../config/constants.js';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const calculateDailyYield = (investmentBalance) => {
  if (investmentBalance < MINIMUM_INITIAL_DEPOSIT) return 0;
  return Number((investmentBalance * DAILY_YIELD_RATE).toFixed(2));
};

export const getMonthlyProfitForecast = ({ mainBalance, hasWallet, yieldPaused, nextYieldAt, credited, now }) => {
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
  else if (!Number.isFinite(mainBalance) || mainBalance < 0) status = 'BALANCE_UNAVAILABLE';
  else if (mainBalance < MINIMUM_INITIAL_DEPOSIT) {
    months.forEach((month) => { month.estimated = 0; });
  } else {
    const next = nextYieldAt ? new Date(nextYieldAt).getTime() : NaN;
    if (yieldPaused || !Number.isFinite(next)) status = 'SCHEDULE_UNAVAILABLE';
    else {
      const daily = calculateDailyYield(mainBalance);
      const counts = [0, 0, 0, 0];
      for (let due = Math.max(now, next); due < starts[4]; due += DAY_IN_MS) {
        const index = starts.findIndex((start, position) => position < 4 && due >= start && due < starts[position + 1]);
        if (index >= 0) counts[index]++;
      }
      months.forEach((month, index) => { month.estimated = Number((counts[index] * daily).toFixed(2)); });
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
