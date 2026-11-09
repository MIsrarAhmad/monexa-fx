// Backend/src/jobs/yieldCron.js
import cron from 'node-cron';
import { processDailyYields } from '../services/yieldService.js';

export const initYieldCron = () => {
  // --- PRODUCTION SCHEDULE (Runs daily at 00:00 UTC) ---
  // cron.schedule('0 0 * * *', async () => {

  // --- TESTING SCHEDULE (Runs every 3 minutes) ---
  cron.schedule('*/3 * * * *', async () => {
    console.log('⏰ [TEST MODE] Triggering 3-minute yield distribution...');
    try {
      await processDailyYields();
      console.log('✅ [TEST MODE] 3-minute yield calculation completed!');
    } catch (error) {
      console.error('❌ Cron Execution Failed:', error.message);
    }
  });

  console.log('Daily Yield Cron Job Worker initialized (TEST MODE: Running every 3 minutes)');
};