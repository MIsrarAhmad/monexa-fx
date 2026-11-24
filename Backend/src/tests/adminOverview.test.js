import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';
import Referral from '../models/Referral.js';
import { getAdminCountryCounts, getAdminStats, getAdminUserFinancialLedger, getAdminUserOverview } from '../controllers/adminController.js';
import adminRoutes from '../routes/adminRoutes.js';
import { getMonthlyPassiveReferralForecast, getMonthlyProfitForecast } from '../utils/yieldRules.js';

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
  const now = Date.parse('2026-01-15T12:00:00Z');
  t.mock.method(Date, 'now', () => now);
  const id = new mongoose.Types.ObjectId();
  const aggregate = t.mock.method(User, 'aggregate', async () => [{
    count: [{ total: 26 }],
    users: [{
      _id: id, name: 'Jane', email: 'jane@example.com', country: 'GB', createdAt: new Date('2024-01-01'),
      mainBalance: 125, profitBalance: 20, referralBalance: 5, status: 'BELOW_THRESHOLD',
      kycStatus: 'APPROVED', hasWallet: true, unwithdrawnProfitCounter: 50,
      password: 'secret', kycDetails: { documentNumber: 'private' },
    }],
  }]);
  const transactions = t.mock.method(Transaction, 'aggregate', async () => [{
    _id: id, totalDeposited: 500, totalWithdrawn: 120, totalReferralEarned: 75, currentMonthProfit: 12,
    depositCompletedCount: 2, depositPendingCount: 1, withdrawalCompletedCount: 1, withdrawalRejectedCount: 2,
  }]);

  const data = await invoke(getAdminUserOverview, { page: '2', search: 'Jane.*', status: 'BELOW_THRESHOLD' });
  assert.deepEqual(data.users, [{
    userId: id, name: 'Jane', email: 'jane@example.com', country: 'GB',
    joinedAt: new Date('2024-01-01'), totalDeposited: 500, totalWithdrawn: 120,
    depositCounts: { pending: 1, approved: 0, completed: 2, rejected: 0 },
    withdrawalCounts: { pending: 0, approved: 0, completed: 1, rejected: 2 },
    totalReferralEarned: 75,
    monthlyProfit: {
      status: 'AVAILABLE',
      current: { month: '2026-01', credited: 12, estimatedTotal: 12 },
      nextMonths: [
        { month: '2026-02', estimated: 0 }, { month: '2026-03', estimated: 0 }, { month: '2026-04', estimated: 0 },
      ],
      nextThreeTotal: 0,
    },
    mainBalance: 125,
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
  assert.ok(match.$or.some((entry) => entry.type === 'DEPOSIT'));
  assert.ok(match.$or.some((entry) => entry.type === 'WITHDRAWAL_REQUEST'));
  const grouped = transactions.mock.calls[0].arguments[0][1].$group;
  assert.deepEqual(grouped.priorWithdrawalCount.$sum.$cond[0].$and[1],
    { $in: ['$status', ['PENDING', 'COMPLETED']] });
  assert.deepEqual(grouped.currentMonthProfit.$sum.$cond[0].$and, [
    { $eq: ['$type', 'DAILY_YIELD'] },
    { $gte: ['$createdAt', new Date('2026-01-01T00:00:00Z')] },
    { $lte: ['$createdAt', new Date(now)] },
  ]);
});

test('monthly forecast uses UTC months and increases the step as retained profit grows', () => {
  const forecast = getMonthlyProfitForecast({
    mainBalance: 300, profitBalance: 0, hasWallet: true, yieldPaused: false,
    nextYieldAt: new Date('2028-02-01T00:00:00Z'),
    credited: 9, now: Date.parse('2028-01-31T12:00:00Z'),
  });
  assert.deepEqual(forecast, {
    status: 'AVAILABLE',
    current: { month: '2028-01', credited: 9, estimatedTotal: 9 },
    nextMonths: [
      { month: '2028-02', estimated: 87 },
      { month: '2028-03', estimated: 120 },
      { month: '2028-04', estimated: 161 },
    ],
    nextThreeTotal: 368,
  });
});

test('monthly forecast handles overdue schedules, threshold and unavailable wallets without inventing earnings', () => {
  const now = Date.parse('2026-01-31T23:30:00Z');
  const input = {
    mainBalance: 300, profitBalance: 0, hasWallet: true, yieldPaused: false,
    nextYieldAt: new Date('2026-01-29T23:30:00Z'), credited: 6, now,
  };
  const overdue = getMonthlyProfitForecast(input);
  assert.equal(overdue.current.estimatedTotal, 9);
  assert.deepEqual(overdue.nextMonths.map((month) => month.estimated), [84, 120, 161]);
  const belowThreshold = getMonthlyProfitForecast({ ...input, mainBalance: 299.99, yieldPaused: true });
  assert.equal(belowThreshold.current.estimatedTotal, 6);
  assert.equal(belowThreshold.nextThreeTotal, 0);
  for (const variant of [
    { hasWallet: false }, { yieldPaused: true }, { nextYieldAt: null },
    { mainBalance: NaN }, { profitBalance: NaN }, { profitBalance: -1 },
  ]) {
    const unavailable = getMonthlyProfitForecast({ ...input, ...variant });
    assert.notEqual(unavailable.status, 'AVAILABLE');
    assert.equal(unavailable.current.credited, 6);
    assert.equal(unavailable.current.estimatedTotal, null);
    assert.equal(unavailable.nextThreeTotal, null);
  }
});

test('overview reports recorded profit separately from future estimates for each user', async (t) => {
  const now = Date.parse('2026-01-30T12:00:00Z');
  t.mock.method(Date, 'now', () => now);
  const id = new mongoose.Types.ObjectId();
  t.mock.method(User, 'aggregate', async () => [{
    count: [{ total: 1 }],
    users: [{
      _id: id, name: 'User', email: 'user@example.com', mainBalance: 300,
      profitBalance: 50, referralBalance: 0, status: 'ACTIVE_QUALIFIED',
      hasWallet: true, yieldPaused: false, nextYieldAt: new Date('2026-01-31T12:00:00Z'),
    }],
  }]);
  t.mock.method(Transaction, 'aggregate', async () => [{ _id: id, currentMonthProfit: 42 }]);
  const data = await invoke(getAdminUserOverview);
  assert.deepEqual(data.users[0].monthlyProfit, {
    status: 'AVAILABLE',
    current: { month: '2026-01', credited: 42, estimatedTotal: 45 },
    nextMonths: [
      { month: '2026-02', estimated: 96 },
      { month: '2026-03', estimated: 142 },
      { month: '2026-04', estimated: 189 },
    ],
    nextThreeTotal: 427,
  });
});

test('passive referral forecast uses each eligible schedule and excludes unqualified referrals', () => {
  const now = Date.parse('2026-01-30T12:00:00Z');
  const referrals = [
    { mainBalance: 300, hasTriggeredInitialBonus: true, isPassiveEligible: true, lastPassivePayoutAt: new Date('2026-01-29T12:00:00Z') },
    { mainBalance: 299, hasTriggeredInitialBonus: true, isPassiveEligible: true, lastPassivePayoutAt: new Date('2026-01-29T12:00:00Z') },
    { mainBalance: 300, hasTriggeredInitialBonus: false },
  ];
  const forecast = getMonthlyPassiveReferralForecast({ referrals, credited: 1.2, now });
  assert.equal(forecast.eligibleCount, 1);
  assert.deepEqual(forecast.current, { month: '2026-01', credited: 1.2, estimatedTotal: 1.6 });
  assert.deepEqual(forecast.nextMonths.map((month) => month.estimated), [5.6, 6.2, 6]);
  assert.equal(forecast.nextThreeTotal, 17.8);
  const restarting = getMonthlyPassiveReferralForecast({
    referrals: [{ ...referrals[0], isPassiveEligible: false }], credited: 0, now,
  });
  assert.equal(restarting.current.estimatedTotal, 0.2);
  const invalid = getMonthlyPassiveReferralForecast({
    referrals: [{ ...referrals[0], lastPassivePayoutAt: 'invalid' }], credited: 0, now,
  });
  assert.equal(invalid.status, 'SCHEDULE_UNAVAILABLE');
  assert.equal(invalid.nextThreeTotal, null);
  const missingBalance = getMonthlyPassiveReferralForecast({
    referrals: [{ ...referrals[0], mainBalance: null }], credited: 0, now,
  });
  assert.equal(missingBalance.status, 'BALANCE_UNAVAILABLE');
  assert.equal(missingBalance.current.estimatedTotal, null);
  const multiple = getMonthlyPassiveReferralForecast({
    referrals: [referrals[0], { ...referrals[0], lastPassivePayoutAt: new Date('2026-01-30T23:00:00Z') }],
    credited: 0, now,
  });
  assert.equal(multiple.eligibleCount, 2);
  assert.equal(multiple.current.estimatedTotal, 0.6);
  assert.equal(multiple.nextMonths[0].estimated, 11.2);
});

test('selected user report separates referral earnings, forecasts and withdrawal eligibility', async (t) => {
  const now = Date.parse('2026-01-30T12:00:00Z');
  t.mock.method(Date, 'now', () => now);
  const id = new mongoose.Types.ObjectId();
  const referredId = new mongoose.Types.ObjectId();
  const user = { _id: id, name: 'User', email: 'user@example.com', referralCode: 'CODE', kycStatus: 'APPROVED' };
  let wallet = { mainBalance: 300, profitBalance: 50, referralBalance: 10, unwithdrawnProfitCounter: 50, nextYieldAt: new Date('2026-01-31T12:00:00Z') };
  t.mock.method(User, 'findOne', () => ({ select: () => ({ lean: async () => user }) }));
  t.mock.method(Wallet, 'findOne', () => ({ select: () => ({ lean: async () => wallet }) }));
  t.mock.method(Wallet, 'find', () => ({ select: () => ({ lean: async () => [{ user: referredId, mainBalance: 300 }] }) }));
  t.mock.method(Referral, 'find', () => ({ select: () => ({ populate: () => ({ lean: async () => [{
    referredUser: { _id: referredId, name: 'Member', email: 'member@example.com' },
    hasTriggeredInitialBonus: true, isPassiveEligible: true, lastPassivePayoutAt: new Date('2026-01-29T12:00:00Z'),
    totalEarnedFromUser: 51.2,
  }] }) }) }));
  const aggregate = t.mock.method(Transaction, 'aggregate', async () => [{
    _id: id, totalDeposited: 300, totalProfit: 50, totalReferralEarned: 51.2,
    totalDirectReferral: 50, totalPassiveReferral: 1.2, currentMonthProfit: 42, currentMonthPassiveReferral: 1.2,
    withdrawalPendingAmount: 10,
  }]);
  t.mock.method(Transaction, 'countDocuments', async () => 0);
  t.mock.method(Transaction, 'find', () => ({ select: () => ({ populate: () => ({ sort: () => ({
    skip: () => ({ limit: () => ({ lean: async () => [] }) }),
  }) }) }) }));
  const res = response();
  const run = async () => {
    await getAdminUserFinancialLedger({ params: { userId: String(id) }, query: {} }, res, (error) => { throw error; });
    return res.body.data;
  };
  const report = await run();
  const grouped = aggregate.mock.calls[0].arguments[0][1].$group;
  assert.deepEqual(Object.keys(grouped.totalReferralEarned), ['$sum']);
  assert.deepEqual(grouped.totalDirectReferral.$sum.$cond[0], { $eq: ['$type', 'REFERRAL_DIRECT_BONUS'] });
  assert.deepEqual(grouped.totalPassiveReferral.$sum.$cond[0], { $eq: ['$type', 'REFERRAL_DAILY_PASSIVE'] });
  assert.ok(grouped.currentMonthDirectReferral && grouped.currentMonthPassiveReferral);
  assert.deepEqual(report.summary.withdrawal, { eligibility: 'ELIGIBLE', requestableGross: 360, estimatedFee: 72, estimatedNet: 288 });
  assert.equal(report.summary.totalDirectReferral, 50);
  assert.equal(report.summary.totalPassiveReferral, 1.2);
  assert.equal(report.summary.withdrawalPendingAmount, 10);
  assert.equal(report.referrals.forecast.current.estimatedTotal, 1.6);
  assert.equal(report.investmentForecast.nextThreeTotal, 427);
  assert.equal(report.user.kycStatus, undefined);
  wallet.unwithdrawnProfitCounter = 0;
  assert.equal((await run()).summary.withdrawal.eligibility, 'PROFIT_LOCKED');
  user.kycStatus = 'PENDING';
  assert.equal((await run()).summary.withdrawal.eligibility, 'KYC_REQUIRED');
  user.kycStatus = 'APPROVED';
  wallet.profitBalance = null;
  assert.equal((await run()).summary.withdrawal.requestableGross, null);
  assert.equal((await run()).summary.withdrawal.eligibility, 'BALANCE_UNAVAILABLE');
  wallet = null;
  assert.equal((await run()).summary.withdrawal.requestableGross, null);
});

test('requestable gross mirrors KYC, profit target, first grace period and pending/completed requests', async (t) => {
  const now = Date.parse('2026-01-02T00:00:00Z');
  t.mock.method(Date, 'now', () => now);
  const ids = Array.from({ length: 14 }, () => new mongoose.Types.ObjectId());
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
    { firstDepositAt: null },
    { firstDepositAt: null },
  ];
  t.mock.method(User, 'aggregate', async () => [{
    count: [{ total: ids.length }], users: variants.map((variant, index) => ({ ...base, ...variant, _id: ids[index] })),
  }]);
  t.mock.method(Transaction, 'aggregate', async () => [
    { _id: ids[4], priorWithdrawalCount: 1 }, { _id: ids[5], priorWithdrawalCount: 1 },
    { _id: ids[10], priorWithdrawalCount: 1 },
    { _id: ids[12], priorWithdrawalCount: 1, qualifiedWithdrawalCount: 1 },
    { _id: ids[13], priorWithdrawalCount: 1, qualifiedWithdrawalCount: 0 },
  ]);
  const data = await invoke(getAdminUserOverview);
  assert.deepEqual(data.users.map((user) => user.requestableGross), [115, 0, 0, 0, 0, 0, 0, 115, 0, 0, 115, 0, 115, 0]);
  assert.deepEqual(data.users.map((user) => user.withdrawalEligibility), [
    'ELIGIBLE', 'KYC_REQUIRED', 'PROFIT_LOCKED', 'PROFIT_LOCKED', 'PROFIT_LOCKED',
    'PROFIT_LOCKED', 'PROFIT_LOCKED', 'ELIGIBLE', 'WALLET_MISSING', 'PROFIT_LOCKED', 'ELIGIBLE', 'EMAIL_VERIFICATION_REQUIRED', 'ELIGIBLE', 'PROFIT_LOCKED',
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
  const reportUrl = `http://127.0.0.1:${server.address().port}/api/admin/financial-ledger/users/${new mongoose.Types.ObjectId()}`;
  assert.equal((await fetch(reportUrl)).status, 401);
  assert.equal((await fetch(reportUrl, { headers: { authorization: `Bearer ${token}` } })).status, 403);
});
