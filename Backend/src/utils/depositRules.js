import { MINIMUM_DEPOSIT_AMOUNT, MINIMUM_INITIAL_DEPOSIT } from '../config/constants.js';

export const getMinimumDepositForBalance = (mainBalance) => {
  if (mainBalance >= MINIMUM_INITIAL_DEPOSIT) return MINIMUM_DEPOSIT_AMOUNT;
  return Math.max(0, Math.ceil((MINIMUM_INITIAL_DEPOSIT - mainBalance) * 100) / 100);
};
