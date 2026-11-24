import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Notification from '../models/Notification.js';
import PushSubscription from '../models/PushSubscription.js';
import adminRoutes from '../routes/adminRoutes.js';

test('only an administrator can review one matching historical completed withdrawal', async (t) => {
  const previous = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'test-secret';
  t.after(() => { if (previous === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previous; });
  const adminId = '507f1f77bcf86cd799439011';
  const userId = '507f1f77bcf86cd799439012';
  const transactionId = '507f1f77bcf86cd799439013';
  let role = 'user';
  let reviewed = false;
  t.mock.method(User, 'findById', () => ({ select: async () => ({ _id: adminId, role }) }));
  const update = t.mock.method(Transaction, 'findOneAndUpdate', async (filter, change, options) => {
    assert.deepEqual(filter, {
      _id: transactionId, user: userId, type: 'WITHDRAWAL_REQUEST',
      status: 'COMPLETED', amount: { $gte: 50 }, profitUnlockQualified: { $exists: false },
    });
    assert.equal(change.$set.profitUnlockQualified, true);
    assert.equal(change.$set.profitUnlockReviewedBy, adminId);
    assert.ok(change.$set.profitUnlockReviewedAt instanceof Date);
    assert.equal(change.$set.profitUnlockReviewReason, 'Historical withdrawal reviewed');
    assert.deepEqual(Object.keys(change.$set).sort(), [
      'profitUnlockQualified', 'profitUnlockReviewReason', 'profitUnlockReviewedAt', 'profitUnlockReviewedBy',
    ].sort());
    assert.equal(options.timestamps, false);
    if (reviewed) return null;
    reviewed = true;
    return { _id: transactionId };
  });
  const notifications = t.mock.method(Notification, 'create', async (data) => ({ ...data, _id: 'notification' }));
  t.mock.method(PushSubscription, 'find', async () => []);
  const app = express();
  app.use(express.json());
  app.use('/api/admin', adminRoutes);
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  const url = `http://127.0.0.1:${server.address().port}/api/admin/users/${userId}/withdrawal-unlock`;
  const token = jwt.sign({ id: adminId }, process.env.JWT_SECRET);
  const post = (body, authenticated = true) => fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(authenticated ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  const body = { transactionId, reason: 'Historical withdrawal reviewed' };
  assert.equal((await post(body, false)).status, 401);
  assert.equal((await post(body)).status, 403);
  assert.equal(update.mock.callCount(), 0);
  role = 'admin';
  assert.equal((await post({ ...body, reason: 'short' })).status, 400);
  assert.equal((await post({ ...body, transactionId: 'invalid' })).status, 400);
  assert.equal((await post(body)).status, 200);
  assert.equal((await post(body)).status, 404);
  assert.equal(notifications.mock.callCount(), 1);
  assert.equal(notifications.mock.calls[0].arguments[0].type, 'WITHDRAWAL_UNLOCKED');
  await new Notification(notifications.mock.calls[0].arguments[0]).validate();
});
