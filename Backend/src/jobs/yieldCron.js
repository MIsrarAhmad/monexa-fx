// Backend/src/jobs/yieldCron.js
import cron from 'node-cron';
import { processDailyYields } from '../services/yieldService.js';

export const initYieldCron = () => {
  cron.schedule('* * * * *', async () => {
    try {
      await processDailyYields();
    } catch (error) {
      console.error('Yield and referral schedule failed:', error.message);
    }
  }, { timezone: 'UTC', noOverlap: true });

  console.log('Yield and referral schedules initialized (checked every minute; payouts remain 24-hourly).');
};