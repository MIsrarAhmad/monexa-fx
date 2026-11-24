import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import adminRoutes from '../routes/adminRoutes.js';

test('preflight is admin-only and performs read-only compatibility checks', async (t) => {
  const previous = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'preflight-test-secret';
  t.after(() => { if (previous === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previous; });
  let role = 'user';
  t.mock.method(User, 'findById', () => ({ select: async () => ({ role }) }));
  let readCount = 0;
  let ended = false;
  t.mock.method(mongoose, 'startSession', async () => ({
    withTransaction: async (fn) => fn(),
    endSession: async () => { ended = true; },
  }));
  t.mock.method(Transaction, 'findOne', () => ({
    select: () => ({ session: () => ({ lean: async () => { readCount++; return null; } }) }),
  }));
  const aggregate = t.mock.method(Transaction, 'aggregate', async () => []);
  const app = express();
  app.use('/api/admin', adminRoutes);
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  const url = `http://127.0.0.1:${server.address().port}/api/admin/deployment/deposit-preflight`;
  const token = jwt.sign({ id: 'user' }, process.env.JWT_SECRET);
  assert.equal((await fetch(url)).status, 401);
  assert.equal((await fetch(url, { headers: { authorization: `Bearer ${token}` } })).status, 403);
  role = 'admin';
  const result = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  assert.equal(result.status, 200);
  assert.deepEqual((await result.json()).data, { transactions: true, queueHistory: true });
  assert.equal(readCount, 1);
  assert.equal(aggregate.mock.callCount(), 1);
  assert.equal(ended, true);
});
