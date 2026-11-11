// Backend/src/jobs/yieldCron.js
import cron from 'node-cron';
import {
  processDailyPassiveReferrals,
  processDailyYields,
} from '../services/yieldService.js';

export const initYieldCron = () => {
  cron.schedule('*/3 * * * *', async () => {
    console.log('Starting scheduled testing yield distribution...');
    try {
      await processDailyYields();
      console.log('Scheduled testing yield calculation completed.');
    } catch (error) {
      console.error('Testing yield schedule failed:', error.message);
    }
  }, { timezone: 'UTC' });

  cron.schedule('0 0 * * *', async () => {
    console.log('Starting scheduled daily passive referral processing...');
    try {
      await processDailyPassiveReferrals();
    } catch (error) {
      console.error('Daily passive referral schedule failed:', error.message);
    }
  }, { timezone: 'UTC' });

  console.log('Testing yield runs every 3 minutes; passive referrals run daily at 00:00 UTC.');
};