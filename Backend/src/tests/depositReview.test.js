import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import Transaction from '../models/Transaction.js';
import Wallet from '../models/Wallet.js';
import User from '../models/User.js';
import { DepositResolutionError, resolveDeposit } from '../services/depositResolution.js';
import { getPendingDeposits } from '../controllers/adminController.js';

const query = (value) => ({ session: async () => value });
const setup = (t, overrides = {}) => {
  const session = { withTransaction: async (work) => work(), endSession: async () => {} };
  t.mock.method(mongoose, 'startSession', async () => session);
  const transaction = {
    _id: new mongoose.Types.ObjectId(), user: new mongoose.Types.ObjectId(), type: 'DEPOSIT',
    status: 'PENDING', amount: 3000, minimumRequiredAtSubmission: 300,
    paymentMethod: 'TRC20', paymentProofUrl: 'proof', save: async (options) => assert.equal(options.session, session),
    ...overrides.transaction,
  };
  const wallet = {
    mainBalance: 0, yieldPaused: true, save: async (options) => assert.equal(options.session, session),
    ...overrides.wallet,
  };
  const user = { save: async (options) => assert.equal(options.session, session) };
  t.mock.method(Transaction, 'findById', () => query(transaction));
  t.mock.method(Wallet, 'findOne', () => query(wallet));
  t.mock.method(User, 'findById', () => query(user));
  return { transaction, wallet, user };
};
const reviewerId = new mongoose.Types.ObjectId();

test('verified correction credits the actual amount and records the original and reviewer', async (t) => {
  const { transaction, wallet, user } = setup(t);
  const result = await resolveDeposit({
    transactionId: transaction._id, action: 'APPROVE', correctedAmount: '300.00',
    correctionReason: 'Receipt shows 300 USDT', reviewerId,
  });
  assert.equal(wallet.mainBalance, 300);
  assert.equal(wallet.yieldPaused, false);
  assert.ok(wallet.nextYieldAt instanceof Date);
  assert.ok(user.firstDepositAt instanceof Date);
  assert.equal(transaction.status, 'COMPLETED');
  assert.equal(transaction.amount, 300);
  assert.equal(transaction.originalSubmittedAmount, 3000);
  assert.equal(transaction.depositCorrectedBy, reviewerId);
  assert.equal(transaction.depositCorrectionReason, 'Receipt shows 300 USDT');
  assert.ok(transaction.depositCorrectedAt instanceof Date);
  assert.equal(result.updatedMainBalance, 300);
});

test('a verified correction below the minimum credits funds without starting yield', async (t) => {
  const { transaction, wallet } = setup(t, { wallet: { mainBalance: 250 } });
  await resolveDeposit({
    transactionId: transaction._id, action: 'APPROVE', correctedAmount: '25',
    correctionReason: 'Receipt shows 25 USDT', reviewerId,
  });
  assert.equal(wallet.mainBalance, 275);
  assert.equal(wallet.yieldPaused, true);
  assert.equal(wallet.nextYieldAt, undefined);
});

test('invalid correction, missing proof, or a previously resolved request cannot credit funds', async (t) => {
  const { transaction, wallet } = setup(t);
  const run = (changes = {}) => resolveDeposit({
    transactionId: transaction._id, action: 'APPROVE', correctedAmount: '300',
    correctionReason: 'Receipt shows 300 USDT', reviewerId, ...changes,
  });
  for (const correctedAmount of ['0', '-1', '12.345', 'Infinity', '']) {
    await assert.rejects(run({ correctedAmount }), DepositResolutionError);
  }
  await assert.rejects(run({ correctionReason: 'short' }), DepositResolutionError);
  transaction.paymentProofUrl = null;
  await assert.rejects(run(), DepositResolutionError);
  transaction.paymentProofUrl = 'proof';
  transaction.merchantTradeNo = 'gateway';
  await assert.rejects(run(), DepositResolutionError);
  transaction.merchantTradeNo = null;
  transaction.status = 'COMPLETED';
  await assert.rejects(run(), (error) => error.status === 409);
  assert.equal(wallet.mainBalance, 0);
});

test('pending deposit context reports ordinal and earlier statuses without inventing legacy principal', async (t) => {
  const id = new mongoose.Types.ObjectId();
  const transaction = { _id: id, type: 'DEPOSIT', paymentMethod: 'TRC20', paymentProofUrl: 'proof', toObject() { return { ...this }; } };
  t.mock.method(Transaction, 'find', () => ({ populate: () => ({ sort: async () => [transaction] }) }));
  const aggregate = t.mock.method(Transaction, 'aggregate', async () => [{ _id: id, history: { earlierRequests: 2, completed: 1, rejected: 1 } }]);
  const res = { status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } };
  await getPendingDeposits({}, res, (error) => { throw error; });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.data[0].queueContext, { requestNumber: 3, earlierCompleted: 1, earlierRejected: 1 });
  assert.equal(res.body.data[0].reviewCapabilities.correctAmount, true);
  assert.equal(res.body.data[0].principalAtSubmission, undefined);
  assert.ok(aggregate.mock.calls[0].arguments[0].some((stage) => stage.$lookup));
});
