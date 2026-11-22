import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';
import { getAdminCountryCounts, getAdminStats, getAdminUserOverview } from '../controllers/adminController.js';
import adminRoutes from '../routes/adminRoutes.js';

const response = () => ({
  statusCode: 200,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});
const invoke = async (handler, query = {}) => {
  const res = response();
  await handler({ query }, res, (error) => { throw error; });
  return res.body.data;
};

test('overview returns page-scoped financial totals and no sensitive user or wallet fields', async (t) => {
  const id = new mongoose.Types.ObjectId();
  const aggregate = t.mock.method(User, 'aggregate', async () => [{
    count: [{ total: 26 }],
    users: [{
      _id: id, name: 'Jane', email: 'jane@example.com', country: 'GB',
      mainBalance: 125, profitBalance: 20, referralBalance: 5, status: 'BELOW_THRESHOLD',
      kycStatus: 'APPROVED', hasWallet: true, unwithdrawnProfitCounter: 50,
      password: 'secret', kycDetails: { documentNumber: 'private' },
    }],
  }]);
  const transactions = t.mock.method(Transaction, 'aggregate', async () => [{
    _id: id, totalDeposited: 500, totalReferralEarned: 75,
  }]);

  const data = await invoke(getAdminUserOverview, { page: '2', search: 'Jane.*', status: 'BELOW_THRESHOLD' });
  assert.deepEqual(data.users, [{
    userId: id, name: 'Jane', email: 'jane@example.com', country: 'GB',
    totalDeposited: 500, totalReferralEarned: 75, mainBalance: 125,
    walletTotal: 150, requestableGross: 150, withdrawalEligibility: 'ELIGIBLE',
    status: 'BELOW_THRESHOLD', remainingToMinThreshold: 175,
  }]);
  assert.deepEqual(data.pagination, { page: 2, pageSize: 25, total: 26, pages: 2 });
  const pipeline = aggregate.mock.calls[0].arguments[0];
  assert.equal(pipeline[0].$match.role, 'user');
  assert.equal(pipeline[0].$match.$or[0].name.$regex, 'Jane\\.\\*');
  assert.deepEqual(pipeline.find((stage) => stage.$facet).$facet.users.slice(0, 2), [{ $skip: 25 }, { $limit: 25 }]);
  assert.ok(pipeline.some((stage) => stage.$match?.status === 'BELOW_THRESHOLD'));
  const statusSwitch = pipeline.find((stage) => stage.$set?.status).$set.status.$switch;
  assert.deepEqual(statusSwitch.branches[0].case, { $gte: ['$mainBalance', 300] });
  assert.deepEqual(statusSwitch.branches[1].case, { $gt: ['$mainBalance', 0] });
  const match = transactions.mock.calls[0].arguments[0][0].$match;
  assert.deepEqual(match.user.$in, [id]);
  assert.ok(match.$or.some((entry) => entry.type === 'DEPOSIT' && entry.status === 'COMPLETED'));
  assert.ok(match.$or.some((entry) => entry.type === 'WITHDRAWAL_REQUEST'
    && entry.status.$in.join(',') === 'PENDING,COMPLETED'));
  const grouped = transactions.mock.calls[0].arguments[0][1].$group;
  assert.deepEqual(grouped.priorWithdrawalCount.$sum.$cond[0].$and[1],
    { $in: ['$status', ['PENDING', 'COMPLETED']] });
});

test('requestable gross mirrors KYC, profit target, first grace period and pending/completed requests', async (t) => {
  const now = Date.parse('2026-01-02T00:00:00Z');
  t.mock.method(Date, 'now', () => now);
  const ids = Array.from({ length: 12 }, () => new mongoose.Types.ObjectId());
  const base = {
    name: 'User', email: 'user@example.com', mainBalance: 100, profitBalance: 10, referralBalance: 5,
    status: 'BELOW_THRESHOLD', kycStatus: 'APPROVED', hasWallet: true,
    unwithdrawnProfitCounter: 0, firstDepositAt: new Date(now - 23 * 60 * 60 * 1000),
    hasUsedGracePeriod: false,
  };
  const variants = [
    {}, { kycStatus: 'PENDING', unwithdrawnProfitCounter: 100 },
    { firstDepositAt: new Date(now - 24 * 60 * 60 * 1000) },
    { hasUsedGracePeriod: true }, {}, {}, { firstDepositAt: null },
    { firstDepositAt: null, unwithdrawnProfitCounter: 50 }, { hasWallet: false },
    { firstDepositAt: null, unwithdrawnProfitCounter: 49.99 },
    { firstDepositAt: null, unwithdrawnProfitCounter: 50 },
    { emailVerified: false, unwithdrawnProfitCounter: 50 },
  ];
  t.mock.method(User, 'aggregate', async () => [{
    count: [{ total: ids.length }], users: variants.map((variant, index) => ({ ...base, ...variant, _id: ids[index] })),
  }]);
  t.mock.method(Transaction, 'aggregate', async () => [
    { _id: ids[4], priorWithdrawalCount: 1 }, { _id: ids[5], priorWithdrawalCount: 1 },
    { _id: ids[10], priorWithdrawalCount: 1 },
  ]);
  const data = await invoke(getAdminUserOverview);
  assert.deepEqual(data.users.map((user) => user.requestableGross), [115, 0, 0, 0, 0, 0, 0, 115, 0, 0, 115, 0]);
  assert.deepEqual(data.users.map((user) => user.withdrawalEligibility), [
    'ELIGIBLE', 'KYC_REQUIRED', 'PROFIT_LOCKED', 'PROFIT_LOCKED', 'PROFIT_LOCKED',
    'PROFIT_LOCKED', 'PROFIT_LOCKED', 'ELIGIBLE', 'WALLET_MISSING', 'PROFIT_LOCKED', 'ELIGIBLE', 'EMAIL_VERIFICATION_REQUIRED',
  ]);
  assert.ok(data.users.every((user) => user.walletTotal === 115));
  assert.ok(data.users.every((user) => !('kycStatus' in user) && !('firstDepositAt' in user)));
});

test('empty overview returns pagination without querying transaction totals', async (t) => {
  t.mock.method(User, 'aggregate', async () => [{ count: [], users: [] }]);
  const transactions = t.mock.method(Transaction, 'aggregate', async () => []);
  const data = await invoke(getAdminUserOverview);
  assert.deepEqual(data, { users: [], pagination: { page: 1, pageSize: 25, total: 0, pages: 0 } });
  assert.equal(transactions.mock.callCount(), 0);
});

test('overview handles empty and missing wallets, invalid parameters, and threshold boundaries', async (t) => {
  const ids = Array.from({ length: 3 }, () => new mongoose.Types.ObjectId());
  t.mock.method(User, 'aggregate', async () => [{
    count: [{ total: 3 }],
    users: [
      { _id: ids[0], name: 'A', email: 'a', mainBalance: 0, profitBalance: 0, referralBalance: 0, status: 'UNINVESTED' },
      { _id: ids[1], name: 'B', email: 'b', country: 'invalid', mainBalance: 299.99, profitBalance: 0, referralBalance: 0, status: 'BELOW_THRESHOLD' },
      { _id: ids[2], name: 'C', email: 'c', country: 'US', mainBalance: 350, profitBalance: 0, referralBalance: 0, status: 'ACTIVE_QUALIFIED' },
    ],
  }]);
  t.mock.method(Transaction, 'aggregate', async () => []);
  const data = await invoke(getAdminUserOverview, { page: '-2', search: { $ne: null }, status: 'invalid' });
  assert.equal(data.pagination.page, 1);
  assert.deepEqual(data.users.map((user) => user.remainingToMinThreshold), [300, 0.01, 0]);
  assert.deepEqual(data.users.map((user) => user.country), [null, null, 'US']);
  assert.deepEqual(data.users.map((user) => user.totalDeposited), [0, 0, 0]);
});

test('country counts include legacy missing and invalid values as unknown', async (t) => {
  const aggregate = t.mock.method(User, 'aggregate', async () => [
    { _id: 'GB', count: 3 }, { _id: null, count: 2 },
    { _id: '', count: 1 }, { _id: 'ZZ', count: 4 }, { _id: 'US', count: 1 },
  ]);
  const data = await invoke(getAdminCountryCounts);
  assert.deepEqual(data.countries, [
    { country: null, count: 7 }, { country: 'GB', count: 3 }, { country: 'US', count: 1 },
  ]);
  assert.deepEqual(aggregate.mock.calls[0].arguments[0][0], { $match: { role: 'user' } });
});

test('stats uses aggregate counts and wallet sums without returning an unbounded user list', async (t) => {
  t.mock.method(User, 'aggregate', async () => [{
    totalUsers: 3, fullyInvestedCount: 1, partiallyInvestedCount: 1, zeroInvestedCount: 1,
  }]);
  t.mock.method(Wallet, 'aggregate', async () => [{
    totalLiquidity: 400, totalProfitBalances: 30, totalReferralBalances: 20,
  }]);
  const fees = t.mock.method(Transaction, 'aggregate', async () => [{ total: 7 }]);
  t.mock.method(Transaction, 'countDocuments', async () => 2);
  const data = await invoke(getAdminStats);
  assert.equal(data.metrics.totalWithdrawableBalance, 450);
  assert.equal(data.metrics.totalUsers, 3);
  assert.equal(data.metrics.totalPlatformFeesCollected, 7);
  assert.deepEqual(data.metrics.segmentation, {
    fullyInvestedCount: 1, partiallyInvestedCount: 1, zeroInvestedCount: 1,
  });
  assert.equal(data.userInvestmentDetails, undefined);
  assert.deepEqual(fees.mock.calls[0].arguments[0][0].$match, { type: 'WITHDRAWAL_REQUEST', status: 'COMPLETED' });
});

test('overview and country routes require authenticated administrators', async (t) => {
  const previous = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'admin-overview-test-secret';
  t.after(() => { if (previous === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previous; });
  let role = 'user';
  t.mock.method(User, 'findById', () => ({ select: async () => ({ role }) }));
  t.mock.method(User, 'aggregate', async (pipeline) => (
    pipeline.some((stage) => stage.$facet) ? [{ count: [], users: [] }] : []
  ));
  const app = express();
  app.use('/api/admin', adminRoutes);
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  const token = jwt.sign({ id: 'user' }, process.env.JWT_SECRET);
  for (const route of ['user-overview', 'country-counts']) {
    const url = `http://127.0.0.1:${server.address().port}/api/admin/${route}`;
    assert.equal((await fetch(url)).status, 401);
    assert.equal((await fetch(url, { headers: { authorization: `Bearer ${token}` } })).status, 403);
    role = 'admin';
    const result = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
    assert.equal(result.status, 200);
    assert.equal((await result.json()).success, true);
    role = 'user';
  }
});
