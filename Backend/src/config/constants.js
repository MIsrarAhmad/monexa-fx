// Backend/src/config/constants.js

// Investment Thresholds
export const MINIMUM_INITIAL_DEPOSIT = 300; // $300 minimum deposit threshold
export const OFFICIAL_TRC20_DEPOSIT_ADDRESS = 'TQfojQp5kTeUm6dKWtn12SF2ZzToauLSX4';

// Withdrawal Rules
// 3 minutes testing threshold (0.05 hours = 3 minutes)
export const WITHDRAWAL_GRACE_PERIOD_HOURS = 0.05; 
export const WITHDRAWAL_LOCK_PROFIT_TARGET = 50;  // $50 profit required after grace period
export const WITHDRAWAL_FEE_PERCENTAGE = 0.20;   // 20% platform fee deduction

// Yield & Referral Rules
export const DAILY_YIELD_RATE = 0.01;              // 1% daily yield
export const REFERRAL_DIRECT_BONUS_FLAT = 50.0;    // $50 direct bonus
export const REFERRAL_DAILY_PASSIVE_USD = 0.20;    // $0.20 daily passive reward