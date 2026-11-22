import test from 'node:test';
import assert from 'node:assert/strict';
import nodemailer from 'nodemailer';
import Transaction from '../models/Transaction.js';
import Wallet from '../models/Wallet.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import PushSubscription from '../models/PushSubscription.js';
import { submitManualDeposit } from '../controllers/depositController.js';
import { requestWithdrawal } from '../controllers/withdrawalController.js';
import { processDepositAction, processWithdrawalAction } from '../controllers/adminController.js';
import { handleBinanceWebhook } from '../controllers/webhookController.js';
import { generateBinanceSignature } from '../config/binance.js';
import { transactionEmailTemplate } from '../utils/transactionEmailTemplates.js';

const user = { _id: 'user-id', name: 'Jane <Doe>', email: 'jane@example.com', kycStatus: 'APPROVED', save: async () => {} };
const address = 'TQfojQp5kTeUm6dKWtn12SF2ZzToauLSX4';
const response = () => ({
  statusCode: 200,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});
const invoke = async (handler, body, extra = {}) => {
  const res = response();
  await handler({ body, user, params: { id: 'tx-id' }, ...extra }, res, (error) => { throw error; });
  await new Promise((resolve) => setImmediate(resolve));
  return res;
};
const setup = (t, { fail = false, delay } = {}) => {
  const oldUser = process.env.SMTP_USER;
  const oldPass = process.env.SMTP_PASS;
  process.env.SMTP_USER = 'test';
  process.env.SMTP_PASS = 'test';
  t.after(() => {
    if (oldUser === undefined) delete process.env.SMTP_USER; else process.env.SMTP_USER = oldUser;
    if (oldPass === undefined) delete process.env.SMTP_PASS; else process.env.SMTP_PASS = oldPass;
  });
  const messages = [];
  t.mock.method(nodemailer, 'createTransport', () => ({
    sendMail: async (message) => {
      messages.push(message);
      if (delay) await delay;
      if (fail) throw new Error('test delivery failure');
      return { messageId: 'message-id' };
    },
  }));
  t.mock.method(User, 'findById', async () => ({ ...user }));
  t.mock.method(Notification, 'create', async () => ({ _id: 'notification-id' }));
  t.mock.method(PushSubscription, 'find', async () => []);
  const attempts = new Set();
  t.mock.method(Transaction, 'updateOne', async (filter) => {
    if (attempts.has(filter._id)) return { modifiedCount: 0 };
    attempts.add(filter._id);
    return { modifiedCount: 1 };
  });
  return messages;
};

test('transaction email escapes untrusted details and describes real withdrawal status and amounts', () => {
  const transaction = {
    _id: '<tx>', type: 'WITHDRAWAL_REQUEST', amount: 123.45,
    feeDeducted: 24.69, netAmount: 98.76, receiverAddress: '<address>', txHash: '<hash>',
  };
  const pending = transactionEmailTemplate('<name>', transaction, 'requested');
  assert.match(pending.html, /awaiting admin review/);
  assert.match(pending.html, /\$123\.45 USDT/);
  assert.match(pending.html, /\$24\.69 USDT/);
  assert.match(pending.html, /\$98\.76 USDT/);
  assert.match(pending.html, /Proposed fee \(20%\) \(not charged\)/);
  assert.match(pending.html, /&lt;name&gt;/);
  assert.match(pending.html, /&lt;address&gt;/);
  const completed = transactionEmailTemplate('Jane', transaction, 'completed');
  assert.match(completed.html, /does not independently confirm an on-chain transfer/);
  assert.match(completed.html, /&lt;hash&gt;/);
  assert.doesNotMatch(completed.html, /has been sent|has been paid/i);
  const rejected = transactionEmailTemplate('Jane', transaction, 'rejected');
  assert.match(rejected.html, /restored to your wallet/);
  assert.match(rejected.html, /Proposed fee \(20%\) \(not charged\)/);
  assert.match(completed.html, /Platform fee \(20%\)/);
  const historic = transactionEmailTemplate('Jane', { ...transaction, feeDeducted: 10 }, 'completed');
  assert.doesNotMatch(historic.html, /Platform fee \(20%\)/);
});

test('successful requests email the persisted transaction and actual withdrawal fee and net', async (t) => {
  const messages = setup(t);
  const wallet = {
    mainBalance: 500, profitBalance: 100, referralBalance: 0, unwithdrawnProfitCounter: 100,
    save: async () => {},
  };
  t.mock.method(Wallet, 'findOne', async () => wallet);
  t.mock.method(Transaction, 'findOne', async () => null);
  t.mock.method(Transaction, 'countDocuments', async () => 0);
  t.mock.method(Transaction, 'create', async (data) => ({ ...data, _id: 'tx-id' }));
  const deposit = await invoke(submitManualDeposit, { amount: 300, txHash: 'hash', paymentMethod: 'TRC20' }, { file: { path: 'proof' } });
  assert.equal(deposit.statusCode, 201);
  assert.match(messages[0].html, /balance has not yet been credited/);
  const withdrawal = await invoke(requestWithdrawal, { amount: 123.45, payoutMethod: 'TRC20', receiverAccount: address });
  assert.equal(withdrawal.statusCode, 200);
  assert.match(messages[1].html, /\$24\.69 USDT/);
  assert.match(messages[1].html, /\$98\.76 USDT/);
  assert.equal(messages.length, 2);
  const invalid = await invoke(requestWithdrawal, { amount: 0, payoutMethod: 'TRC20', receiverAccount: address });
  assert.equal(invalid.statusCode, 400);
  assert.equal(messages.length, 2);
});

test('email delivery failure is explicitly logged without failing a persisted request', async (t) => {
  setup(t, { fail: true });
  const errors = t.mock.method(console, 'error', () => {});
  t.mock.method(Transaction, 'findOne', async () => null);
  t.mock.method(Wallet, 'findOne', async () => ({ mainBalance: 500 }));
  t.mock.method(Transaction, 'create', async (data) => ({ ...data, _id: 'tx-id' }));
  const res = await invoke(submitManualDeposit, { amount: 300, txHash: 'hash', paymentMethod: 'TRC20' }, { file: { path: 'proof' } });
  assert.equal(res.statusCode, 201);
  assert.ok(errors.mock.calls.some((call) => String(call.arguments[0]).includes('delivery failed or was skipped')));
});

test('slow SMTP never delays request or resolution responses and later failures are logged', async (t) => {
  let release;
  const delay = new Promise((resolve) => { release = resolve; });
  t.after(() => release());
  const messages = setup(t, { fail: true, delay });
  const errors = t.mock.method(console, 'error', () => {});
  const wallet = {
    mainBalance: 500, profitBalance: 100, referralBalance: 0, unwithdrawnProfitCounter: 100, save: async () => {},
  };
  t.mock.method(Wallet, 'findOne', async () => wallet);
  t.mock.method(Transaction, 'findOne', async () => null);
  t.mock.method(Transaction, 'countDocuments', async () => 0);
  t.mock.method(Transaction, 'create', async (data) => ({ ...data, _id: data.type }));
  t.mock.method(Transaction, 'findById', async () => ({
    _id: 'admin-tx', user: 'user-id', type: 'DEPOSIT', amount: 300, status: 'PENDING', save: async () => {},
  }));
  let timer;
  try {
    const responses = await Promise.race([
      Promise.all([
        invoke(submitManualDeposit, { amount: 300, txHash: 'hash', paymentMethod: 'TRC20' }, { file: { path: 'proof' } }),
        invoke(requestWithdrawal, { amount: 50, payoutMethod: 'TRC20', receiverAccount: address }),
        invoke(processDepositAction, { action: 'APPROVE' }),
      ]),
      new Promise((resolve) => { timer = setTimeout(() => resolve(null), 1000); }),
    ]);
    assert.ok(responses, 'responses must not wait for SMTP');
    assert.deepEqual(responses.map((res) => res.statusCode), [201, 200, 200]);
    assert.equal(messages.length, 3);
    release();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(errors.mock.calls.filter((call) => String(call.arguments[0]).includes('delivery failed or was skipped')).length, 3);
  } finally {
    clearTimeout(timer);
    release();
  }
});

test('withdrawal rejection restores reserved balances and emails only after resolution', async (t) => {
  const messages = setup(t);
  const wallet = { mainBalance: 400, profitBalance: 10, referralBalance: 5, save: async () => {} };
  t.mock.method(Wallet, 'findOne', async () => wallet);
  const transaction = {
    _id: 'tx-id', user: 'user-id', type: 'WITHDRAWAL_REQUEST', status: 'PENDING',
    amount: 100, feeDeducted: 20, netAmount: 80, receiverAddress: address,
    reservedProfitBalance: 50, reservedReferralBalance: 20, reservedMainBalance: 30,
    save: async function () { assert.equal(messages.length, 0); },
  };
  t.mock.method(Transaction, 'findById', async () => transaction);
  const res = await invoke(processWithdrawalAction, { action: 'REJECT' });
  assert.equal(res.statusCode, 200);
  assert.deepEqual([wallet.mainBalance, wallet.profitBalance, wallet.referralBalance], [430, 60, 25]);
  assert.match(messages[0].html, /restored to your wallet/);
  assert.match(messages[0].html, /\$20\.00 USDT/);
  assert.match(messages[0].html, /\$80\.00 USDT/);
});

test('withdrawal approval communicates the admin status without claiming transfer confirmation', async (t) => {
  const messages = setup(t);
  const wallet = { save: async () => {} };
  t.mock.method(Wallet, 'findOne', async () => wallet);
  t.mock.method(Transaction, 'findById', async () => ({
    _id: 'tx-id', user: 'user-id', type: 'WITHDRAWAL_REQUEST', status: 'PENDING',
    amount: 100, feeDeducted: 20, netAmount: 80, save: async () => {},
  }));
  const res = await invoke(processWithdrawalAction, { action: 'APPROVE' });
  assert.equal(res.statusCode, 200);
  assert.match(messages[0].html, /marked your withdrawal request as completed/);
  assert.match(messages[0].html, /does not independently confirm an on-chain transfer/);
});

test('deposit rejection emails the resolved status', async (t) => {
  const messages = setup(t);
  const wallet = { mainBalance: 500, save: async () => {} };
  t.mock.method(Wallet, 'findOne', async () => wallet);
  t.mock.method(Transaction, 'findById', async () => ({
    _id: 'tx-id', user: 'user-id', type: 'DEPOSIT', status: 'PENDING',
    amount: 300, save: async () => {},
  }));
  const rejected = await invoke(processDepositAction, { action: 'REJECT' });
  assert.equal(rejected.statusCode, 200);
  assert.match(messages[0].html, /not approved/);
  assert.match(messages[0].html, /balance was not credited/);
});

for (const first of ['admin', 'webhook']) {
  test(`Binance deposit is emailed once when ${first} resolves it first`, async (t) => {
    const messages = setup(t);
    const originalSecret = process.env.BINANCE_PAY_SECRET_KEY;
    process.env.BINANCE_PAY_SECRET_KEY = 'test-secret';
    t.after(() => {
      if (originalSecret === undefined) delete process.env.BINANCE_PAY_SECRET_KEY;
      else process.env.BINANCE_PAY_SECRET_KEY = originalSecret;
    });
    const transaction = {
      _id: 'tx-id', user: 'user-id', type: 'DEPOSIT', status: 'PENDING',
      amount: 300, merchantTradeNo: 'binance-id', save: async () => {},
    };
    const wallet = { mainBalance: 500, save: async () => {} };
    t.mock.method(Transaction, 'findById', async () => transaction);
    t.mock.method(Transaction, 'findOne', async () => transaction);
    t.mock.method(Wallet, 'findOne', async () => wallet);
    const admin = () => invoke(processDepositAction, { action: 'APPROVE' });
    const webhook = async () => {
      const body = { bizStatus: 'PAY_SUCCESS', data: JSON.stringify({ merchantTradeNo: 'binance-id', orderAmount: '300' }) };
      const timestamp = '123';
      const nonce = 'nonce';
      const signature = generateBinanceSignature(timestamp, nonce, JSON.stringify(body), 'test-secret');
      const res = response();
      await handleBinanceWebhook({ body, headers: {
        'binancepay-timestamp': timestamp, 'binancepay-nonce': nonce, 'binancepay-signature': signature,
      } }, res);
      await new Promise((resolve) => setImmediate(resolve));
      return res;
    };
    if (first === 'admin') {
      assert.equal((await admin()).statusCode, 200);
      assert.equal((await webhook()).body.returnMessage, 'Already processed');
      assert.match(messages[0].subject, /Deposit credited/);
    } else {
      assert.equal((await webhook()).body.returnMessage, 'Payment Processed');
      assert.equal((await admin()).statusCode, 400);
      assert.match(messages[0].subject, /Deposit credited/);
    }
    assert.equal(wallet.mainBalance, 800);
    assert.equal(messages.length, 1);
  });
}

test('concurrent admin resolutions attempt only one email without gating resolution', async (t) => {
  const messages = setup(t);
  const wallet = { mainBalance: 400, profitBalance: 0, referralBalance: 0, save: async () => {} };
  t.mock.method(Wallet, 'findOne', async () => wallet);
  t.mock.method(Transaction, 'findById', async () => ({
    _id: 'tx-id', user: 'user-id', type: 'WITHDRAWAL_REQUEST', status: 'PENDING',
    amount: 100, feeDeducted: 20, netAmount: 80,
    reservedProfitBalance: 100, reservedReferralBalance: 0, reservedMainBalance: 0,
    save: async () => {},
  }));
  const results = await Promise.all([
    invoke(processWithdrawalAction, { action: 'REJECT' }),
    invoke(processWithdrawalAction, { action: 'REJECT' }),
  ]);
  assert.deepEqual(results.map((result) => result.statusCode), [200, 200]);
  assert.equal(messages.length, 1);
  assert.equal(Transaction.updateOne.mock.callCount(), 2);
  const [filter, , options] = Transaction.updateOne.mock.calls[0].arguments;
  assert.deepEqual(filter.resolutionEmailAttemptedAt, { $exists: false });
  assert.equal(filter.status, 'REJECTED');
  assert.equal(options.strict, false);
});

test('transient resolution failure does not block a later retry or send an early email', async (t) => {
  const messages = setup(t);
  let fails = true;
  t.mock.method(Wallet, 'findOne', async () => ({
    mainBalance: 500, save: async () => { if (fails) throw new Error('write failed'); },
  }));
  t.mock.method(Transaction, 'findById', async () => ({
    _id: 'tx-id', user: 'user-id', type: 'DEPOSIT', amount: 300, status: 'PENDING', save: async () => {},
  }));
  await assert.rejects(invoke(processDepositAction, { action: 'APPROVE' }), /write failed/);
  assert.equal(messages.length, 0);
  assert.equal(Transaction.updateOne.mock.callCount(), 0);
  fails = false;
  const result = await invoke(processDepositAction, { action: 'APPROVE' });
  assert.equal(result.statusCode, 200);
  assert.equal(messages.length, 1);
});

test('email deduplication database failure is logged without failing resolution', async (t) => {
  const messages = setup(t);
  const errors = t.mock.method(console, 'error', () => {});
  Transaction.updateOne.mock.mockImplementation(async () => { throw new Error('write failed'); });
  t.mock.method(Wallet, 'findOne', async () => ({ mainBalance: 500, save: async () => {} }));
  t.mock.method(Transaction, 'findById', async () => ({
    _id: 'tx-id', user: 'user-id', type: 'DEPOSIT', amount: 300, status: 'PENDING', save: async () => {},
  }));
  const result = await invoke(processDepositAction, { action: 'APPROVE' });
  assert.equal(result.statusCode, 200);
  assert.equal(messages.length, 0);
  assert.ok(errors.mock.calls.some((call) => String(call.arguments[0]).includes('email could not be scheduled')));
});
