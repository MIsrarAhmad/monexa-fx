import test from 'node:test';
import assert from 'node:assert/strict';
import Wallet from '../models/Wallet.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Referral from '../models/Referral.js';
import Notification from '../models/Notification.js';
import PushSubscription from '../models/PushSubscription.js';
import { calculateDailyYield } from '../utils/yieldRules.js';
import { processDailyYields } from '../services/yieldService.js';

test('daily yield counts complete $100 steps of main balance and retained profit', () => {
  for (const [main, profit, expected] of [
    [300, 0, 3], [300, 99.99, 3], [300, 99.999, 3], [300, 100, 4],
    [399.999, 0, 3], [300, 99.99999999999999, 3], [300.1, 99.89999999999998, 3],
    [350.25, 49.75, 4], [300.1, 99.9, 4], [300, 1e-7, 3], [299.99, 1000, 0],
  ]) {
    assert.equal(calculateDailyYield(main, profit), expected);
  }
  for (const [main, profit] of [[NaN, 0], [300, NaN], [300, -1], [300, undefined]]) {
    assert.throws(() => calculateDailyYield(main, profit), /Invalid balance/);
  }
});

test('scheduled credits apply steps without backdating, resetting timers, or including referrals', async (t) => {
  const past = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const future = new Date(Date.now() + 60 * 60 * 1000);
  const wallet = {
    user: { _id: 'eligible', hasUsedGracePeriod: true },
    mainBalance: 300, profitBalance: 99, referralBalance: 10000,
    unwithdrawnProfitCounter: 0, yieldPaused: false, nextYieldAt: past,
    async save() {},
  };
  const waiting = {
    user: { _id: 'waiting' }, mainBalance: 300, profitBalance: 100,
    unwithdrawnProfitCounter: 0, yieldPaused: false, nextYieldAt: future,
    async save() { assert.fail('future schedule must not be reset'); },
  };
  const belowMinimum = {
    user: { _id: 'below' }, mainBalance: 299.99, profitBalance: 1000,
    yieldPaused: true, nextYieldAt: null,
    async save() { assert.fail('already paused wallet must not be changed'); },
  };
  const credits = [];
  t.mock.method(Wallet, 'find', () => ({ populate: async () => [wallet, waiting, belowMinimum] }));
  t.mock.method(User, 'distinct', async () => []);
  t.mock.method(Referral, 'find', async () => []);
  t.mock.method(Transaction, 'create', async (transaction) => { credits.push(transaction); });
  t.mock.method(Notification, 'create', async () => ({ _id: 'notification' }));
  t.mock.method(PushSubscription, 'find', async () => []);

  const started = Date.now();
  assert.equal((await processDailyYields()).processedCount, 1);
  assert.equal(wallet.profitBalance, 102);
  assert.equal(credits[0].amount, 3);
  assert.ok(wallet.nextYieldAt.getTime() >= started + 24 * 60 * 60 * 1000);
  assert.equal(waiting.nextYieldAt, future);
  assert.equal((await processDailyYields()).processedCount, 0);
  assert.equal(credits.length, 1);

  wallet.nextYieldAt = past;
  await processDailyYields();
  assert.equal(credits[1].amount, 4);
  wallet.profitBalance = 99;
  wallet.nextYieldAt = past;
  await processDailyYields();
  assert.equal(credits[2].amount, 3);
  assert.equal(wallet.profitBalance, 102);
  assert.equal(wallet.referralBalance, 10000);
});
