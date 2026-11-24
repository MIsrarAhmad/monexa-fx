import test from 'node:test';
import assert from 'node:assert/strict';
import Transaction from '../models/Transaction.js';
import Wallet from '../models/Wallet.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import PushSubscription from '../models/PushSubscription.js';
import { getWithdrawalEligibility } from '../utils/withdrawalRules.js';
import { requestWithdrawal } from '../controllers/withdrawalController.js';
import { getWithdrawalInfo } from '../controllers/walletController.js';
import { processWithdrawalAction } from '../controllers/adminController.js';

const address = 'TQfojQp5kTeUm6dKWtn12SF2ZzToauLSX4';
const response = () => ({
  statusCode: 200,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});
const invoke = async (handler, body = {}) => {
  const res = response();
  await handler({ user: { _id: 'user-id' }, params: { id: 'tx-id' }, body }, res, (error) => { throw error; });
  return res;
};

test('grace, profit threshold and completed unlock eligibility have correct boundaries', () => {
  const now = Date.parse('2026-01-02T00:00:00Z');
  const user = { firstDepositAt: new Date(now - 23 * 3600000), hasUsedGracePeriod: false };
  const get = (overrides = {}) => getWithdrawalEligibility({
    user, wallet: { unwithdrawnProfitCounter: 0 }, priorWithdrawalCount: 0,
    permanentlyUnlocked: false, now, ...overrides,
  });
  assert.equal(get().isInGracePeriod, true);
  assert.equal(get({ priorWithdrawalCount: 1 }).canWithdraw, false);
  assert.equal(get({ now: now + 3600000 }).canWithdraw, false);
  assert.equal(get({ now: now + 3600000, wallet: { unwithdrawnProfitCounter: 49.99 } }).canWithdraw, false);
  assert.equal(get({ now: now + 3600000, wallet: { unwithdrawnProfitCounter: 50 } }).canWithdraw, true);
  assert.equal(get({ now: now + 3600000, permanentlyUnlocked: true }).canWithdraw, true);
});

test('qualifying request unlocks only after approval; rejected and grace-only requests do not', async (t) => {
  const user = { _id: 'user-id', kycStatus: 'APPROVED', hasUsedGracePeriod: true, save: async () => {} };
  const wallet = { mainBalance: 300, profitBalance: 60, referralBalance: 0, unwithdrawnProfitCounter: 60, save: async () => {} };
  let tx;
  t.mock.method(User, 'findById', async () => user);
  t.mock.method(Wallet, 'findOne', async () => wallet);
  t.mock.method(Transaction, 'countDocuments', async (query) => query.profitUnlockQualified
    ? Number(tx?.status === 'COMPLETED' && tx.profitUnlockQualified)
    : Number(tx?.status === 'PENDING' || tx?.status === 'COMPLETED'));
  t.mock.method(Transaction, 'create', async (data) => {
    tx = { ...data, _id: 'tx-id', save: async () => {} };
    return tx;
  });
  t.mock.method(Transaction, 'findById', async () => tx);
  t.mock.method(Transaction, 'updateOne', async () => ({ modifiedCount: 0 }));
  t.mock.method(Notification, 'create', async (data) => ({ ...data, _id: 'notification' }));
  t.mock.method(PushSubscription, 'find', async () => []);
  const payload = { amount: 50, payoutMethod: 'TRC20', receiverAccount: address };
  const requested = await invoke(requestWithdrawal, payload);
  assert.equal(requested.statusCode, 200);
  assert.equal(tx.profitUnlockQualified, true);
  assert.equal(tx.feeDeducted, 10);
  assert.equal(tx.netAmount, 40);
  assert.equal((await invoke(getWithdrawalInfo)).body.data.withdrawalRules.permanentlyUnlocked, false);
  await invoke(processWithdrawalAction, { action: 'REJECT' });
  assert.equal((await invoke(getWithdrawalInfo)).body.data.withdrawalRules.permanentlyUnlocked, false);
  await invoke(requestWithdrawal, payload);
  await invoke(processWithdrawalAction, { action: 'APPROVE' });
  const rules = (await invoke(getWithdrawalInfo)).body.data.withdrawalRules;
  assert.equal(wallet.unwithdrawnProfitCounter, 0);
  assert.equal(rules.permanentlyUnlocked, true);
  assert.equal(rules.canWithdraw, true);
  assert.equal((await invoke(requestWithdrawal, { ...payload, amount: 5 })).statusCode, 200);
  assert.equal(tx.profitUnlockQualified, false);
});

test('grace request and a request below $50 do not qualify for the permanent unlock', async (t) => {
  const user = { _id: 'user-id', kycStatus: 'APPROVED', hasUsedGracePeriod: false, firstDepositAt: new Date(), save: async () => {} };
  const wallet = { mainBalance: 300, profitBalance: 0, referralBalance: 0, unwithdrawnProfitCounter: 0, save: async () => {} };
  let tx;
  t.mock.method(User, 'findById', async () => user);
  t.mock.method(Wallet, 'findOne', async () => wallet);
  t.mock.method(Transaction, 'countDocuments', async () => 0);
  t.mock.method(Transaction, 'create', async (data) => { tx = { ...data, _id: 'tx-id' }; return tx; });
  const notifications = t.mock.method(Notification, 'create', async (data) => ({ ...data, _id: 'notification' }));
  t.mock.method(PushSubscription, 'find', async () => []);
  await invoke(requestWithdrawal, { amount: 50, payoutMethod: 'TRC20', receiverAccount: address });
  assert.equal(tx.profitUnlockQualified, false);
  assert.equal(wallet.mainBalance, 250);
  assert.equal(wallet.yieldPaused, true);
  const notice = notifications.mock.calls.map((call) => call.arguments[0]).find((item) => item.type === 'YIELD_PAUSED');
  assert.match(notice.message, /Add \$50\.00/);
  assert.match(notice.message, /reserved withdrawal/i);
  await new Notification({ ...notice, user: '507f1f77bcf86cd799439011' }).validate();
  wallet.unwithdrawnProfitCounter = 50;
  wallet.profitBalance = 50;
  await invoke(requestWithdrawal, { amount: 49, payoutMethod: 'TRC20', receiverAccount: address });
  assert.equal(tx.profitUnlockQualified, false);
});

test('rejecting a withdrawal restores reserved principal and resumes the 24-hour yield schedule', async (t) => {
  const user = { _id: 'user-id', kycStatus: 'APPROVED', firstDepositAt: new Date(), save: async () => {} };
  const wallet = { mainBalance: 300, profitBalance: 0, referralBalance: 0, unwithdrawnProfitCounter: 0, save: async () => {} };
  let tx;
  t.mock.method(User, 'findById', async () => user);
  t.mock.method(Wallet, 'findOne', async () => wallet);
  t.mock.method(Transaction, 'countDocuments', async () => 0);
  t.mock.method(Transaction, 'create', async (data) => {
    tx = { ...data, _id: 'tx-id', save: async () => {} };
    return tx;
  });
  t.mock.method(Transaction, 'findById', async () => tx);
  t.mock.method(Transaction, 'updateOne', async () => ({ modifiedCount: 0 }));
  t.mock.method(Notification, 'create', async (data) => ({ ...data, _id: 'notification' }));
  t.mock.method(PushSubscription, 'find', async () => []);
  await invoke(requestWithdrawal, { amount: 70, payoutMethod: 'TRC20', receiverAccount: address });
  assert.equal(wallet.mainBalance, 230);
  assert.equal(wallet.yieldPaused, true);
  await invoke(processWithdrawalAction, { action: 'REJECT' });
  assert.equal(wallet.mainBalance, 300);
  assert.equal(wallet.yieldPaused, false);
  assert.ok(wallet.nextYieldAt > new Date());
  assert.equal(tx.status, 'REJECTED');
});
