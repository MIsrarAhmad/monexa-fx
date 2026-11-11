// Backend/src/jobs/yieldCron.js
import cron from 'node-cron';
import { processDailyYields } from '../services/yieldService.js';

export const initYieldCron = () => {
  cron.schedule('0 0 * * *', async () => {
    console.log('Starting scheduled daily yield distribution...');
    try {
      await processDailyYields();
      console.log('Scheduled daily yield calculation completed.');
    } catch (error) {
      console.error('Daily yield schedule failed:', error.message);
    }
  }, { timezone: 'UTC' });

  console.log('Daily Yield Cron Job Worker initialized (runs daily at 00:00 UTC)');
};