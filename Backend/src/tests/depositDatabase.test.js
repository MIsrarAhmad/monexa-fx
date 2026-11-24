import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';
import { resolveDeposit } from '../services/depositResolution.js';
import { getAdminUserOverview, getAdminUserFinancialLedger, getPendingDeposits, getPendingWithdrawals } from '../controllers/adminController.js';

const uri = process.env.MONEXA_TEST_MONGO_URI;
const response = () => ({
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

test('deposit review is atomic and queue context reflects actual history', { skip: !uri }, async (t) => {
  const parsed = new URL(uri);
  assert.equal(parsed.hostname, '127.0.0.1');
  assert.equal(parsed.pathname, '/monexa_admin_test');
  await mongoose.connect(uri);
  const ids = [];
  t.after(async () => {
    await Transaction.deleteMany({ user: { $in: ids } });
    await Wallet.deleteMany({ user: { $in: ids } });
    await User.deleteMany({ _id: { $in: ids } });
    await mongoose.disconnect();
  });
  const createUser = async () => {
    const id = new mongoose.Types.ObjectId();
    ids.push(id);
    return User.create({
      _id: id, name: 'Test User', email: `${id}@example.invalid`, password: 'testing123',
      referralCode: String(id), kycStatus: 'APPROVED',
    });
  };
  const firstUser = await createUser();
  await Wallet.create({ user: firstUser._id, mainBalance: 0, yieldPaused: true });
  const deposit = await Transaction.create({
    user: firstUser._id, type: 'DEPOSIT', status: 'PENDING', amount: 3000,
    minimumRequiredAtSubmission: 300, paymentMethod: 'TRC20', paymentProofUrl: 'proof',
  });
  const reviewerId = firstUser._id;
  const review = (amount) => resolveDeposit({
    transactionId: deposit._id, action: 'APPROVE', correctedAmount: amount,
    correctionReason: 'Receipt verified by admin', reviewerId,
  });
  const attempts = await Promise.allSettled([review('300'), review('250')]);
  assert.equal(attempts.filter((attempt) => attempt.status === 'fulfilled').length, 1);
  assert.equal(attempts.filter((attempt) => attempt.status === 'rejected' && attempt.reason.status === 409).length, 1);
  const saved = await Transaction.findById(deposit._id).lean();
  const wallet = await Wallet.findOne({ user: firstUser._id }).lean();
  assert.equal(saved.status, 'COMPLETED');
  assert.equal(saved.originalSubmittedAmount, 3000);
  assert.ok([250, 300].includes(saved.amount));
  assert.equal(wallet.mainBalance, saved.amount);

  const gatewayUser = await createUser();
  await Wallet.create({ user: gatewayUser._id, mainBalance: 0 });
  const gatewayDeposit = await Transaction.create({
    user: gatewayUser._id, type: 'DEPOSIT', status: 'PENDING', amount: 300,
    minimumRequiredAtSubmission: 300, merchantTradeNo: `order-${gatewayUser._id}`,
  });
  const gatewayAttempts = await Promise.allSettled([
    resolveDeposit({ transactionId: gatewayDeposit._id, action: 'APPROVE' }),
    resolveDeposit({ merchantTradeNo: gatewayDeposit.merchantTradeNo, action: 'APPROVE', gatewayAmount: '300.00000000' }),
  ]);
  assert.equal(gatewayAttempts.filter((attempt) => attempt.status === 'fulfilled').length, 1);
  assert.equal(gatewayAttempts.filter((attempt) => attempt.status === 'rejected' && attempt.reason.status === 409).length, 1);
  assert.equal((await Wallet.findOne({ user: gatewayUser._id }).lean()).mainBalance, 300);

  const rollbackUser = await createUser();
  await Wallet.create({ user: rollbackUser._id, mainBalance: 0, yieldPaused: true });
  const rollbackDeposit = await Transaction.create({
    user: rollbackUser._id, type: 'DEPOSIT', status: 'PENDING', amount: 300,
    minimumRequiredAtSubmission: 300, paymentMethod: 'TRC20', paymentProofUrl: 'proof',
  });
  const originalSave = Transaction.prototype.save;
  const save = t.mock.method(Transaction.prototype, 'save', function (...args) {
    if (String(this._id) === String(rollbackDeposit._id)) throw new Error('injected transaction write failure');
    return originalSave.apply(this, args);
  });
  await assert.rejects(resolveDeposit({ transactionId: rollbackDeposit._id, action: 'APPROVE' }), /injected transaction write failure/);
  save.mock.restore();
  assert.equal((await Wallet.findOne({ user: rollbackUser._id }).lean()).mainBalance, 0);
  assert.equal((await Transaction.findById(rollbackDeposit._id).lean()).status, 'PENDING');
  assert.equal((await User.findById(rollbackUser._id).lean()).firstDepositAt, null);

  const historyUser = await createUser();
  await Wallet.create({ user: historyUser._id, mainBalance: 250 });
  const common = { user: historyUser._id, type: 'DEPOSIT', amount: 300, paymentMethod: 'TRC20', paymentProofUrl: 'proof' };
  await Transaction.create({ ...common, status: 'REJECTED', createdAt: new Date('2024-01-01') });
  await Transaction.create({ ...common, status: 'COMPLETED', createdAt: new Date('2024-01-02') });
  const pending = await Transaction.create({ ...common, status: 'PENDING', principalAtSubmission: 250, createdAt: new Date('2024-01-03') });
  const withdrawal = { user: historyUser._id, type: 'WITHDRAWAL_REQUEST', amount: 50 };
  await Transaction.create({ ...withdrawal, status: 'COMPLETED', createdAt: new Date('2024-01-01') });
  await Transaction.create({ ...withdrawal, status: 'REJECTED', createdAt: new Date('2024-01-02') });
  const pendingWithdrawal = await Transaction.create({ ...withdrawal, status: 'PENDING', createdAt: new Date('2024-01-03') });
  const queue = response();
  await getPendingDeposits({}, queue, (error) => { throw error; });
  const entry = queue.body.data.find((item) => String(item._id) === String(pending._id));
  assert.deepEqual(entry.queueContext, { requestNumber: 3, earlierCompleted: 1, earlierRejected: 1 });
  assert.equal(entry.principalAtSubmission, 250);
  const withdrawalQueue = response();
  await getPendingWithdrawals({}, withdrawalQueue, (error) => { throw error; });
  const cashout = withdrawalQueue.body.data.find((item) => String(item._id) === String(pendingWithdrawal._id));
  assert.deepEqual(cashout.queueContext, { requestNumber: 3, earlierCompleted: 1, earlierRejected: 1 });
  const overview = response();
  await getAdminUserOverview({ query: { search: historyUser.email } }, overview, (error) => { throw error; });
  assert.deepEqual(overview.body.data.users[0].depositCounts, { pending: 1, approved: 0, completed: 1, rejected: 1 });
  assert.deepEqual(overview.body.data.users[0].withdrawalCounts, { pending: 1, approved: 0, completed: 1, rejected: 1 });
  assert.ok(overview.body.data.users[0].joinedAt);
  const ledger = response();
  await getAdminUserFinancialLedger({ params: { userId: String(historyUser._id) }, query: { type: 'WITHDRAWAL_REQUEST' } }, ledger, (error) => { throw error; });
  assert.equal(ledger.body.data.pagination.total, 3);
  assert.ok(ledger.body.data.transactions.every((item) => item.type === 'WITHDRAWAL_REQUEST'));
  const reviewedLedger = response();
  await getAdminUserFinancialLedger({ params: { userId: String(firstUser._id) }, query: { type: 'DEPOSIT' } }, reviewedLedger, (error) => { throw error; });
  assert.equal(reviewedLedger.body.data.transactions[0].originalSubmittedAmount, 3000);
  assert.equal(reviewedLedger.body.data.transactions[0].depositCorrectedBy.name, 'Test User');
});
