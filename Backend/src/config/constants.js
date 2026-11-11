// Backend/src/config/constants.js

// Investment Thresholds
export const MINIMUM_DEPOSIT_AMOUNT = 30;
export const MINIMUM_INITIAL_DEPOSIT = 300; // $300 minimum deposit threshold
export const MINIMUM_YIELD_BALANCE = 30; // Temporary testing threshold
export const OFFICIAL_TRC20_DEPOSIT_ADDRESS = 'TQfojQp5kTeUm6dKWtn12SF2ZzToauLSX4';

// Withdrawal Rules
export const WITHDRAWAL_GRACE_PERIOD_HOURS = 10 / 60; // Temporary 10-minute testing period
export const WITHDRAWAL_LOCK_PROFIT_TARGET = 50;  // $50 profit required after grace period
export const WITHDRAWAL_FEE_PERCENTAGE = 0.20;   // 20% platform fee deduction

// Yield & Referral Rules
export const DAILY_YIELD_RATE = 0.01;              // 1% yield rate
export const REFERRAL_DIRECT_BONUS_FLAT = 50.0;    // $50 direct bonus
export const REFERRAL_DAILY_PASSIVE_USD = 0.20;    // $0.20 daily passive reward