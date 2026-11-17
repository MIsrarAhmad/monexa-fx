import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import express from 'express';
import User from '../models/User.js';
import Wallet from '../models/Wallet.js';
import Referral from '../models/Referral.js';
import { getMe, loginUser, registerUser } from '../controllers/authController.js';
import { updateProfile } from '../controllers/userController.js';
import { COUNTRY_CODES, isValidCountryCode } from '../utils/countries.js';
import { isValidDateOfBirth } from '../utils/dateOfBirth.js';
import authRoutes from '../routes/authRoutes.js';

const validRegistration = {
  name: ' Jane Doe ',
  fatherName: ' John Doe ',
  gender: 'prefer_not_to_say',
  dateOfBirth: '2000-02-29',
  country: 'GB',
  email: ' Jane@example.com ',
  password: 'Password1!',
  referralCode: ' inviter ',
};

const response = () => ({
  statusCode: 200,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

const invoke = async (handler, body, user = { _id: 'user-id' }) => {
  const res = response();
  await handler({ body, user }, res, (error) => { throw error; });
  return res;
};

test('country codes distinguish ISO countries from other ICU regions', () => {
  assert.equal(COUNTRY_CODES.length, 249);
  for (const code of ['GB', 'US', 'PK', 'AX']) assert.equal(isValidCountryCode(code), true);
  for (const code of ['ZZ', 'EU', 'XK', 'UK', 'gb', 'US ', '', null]) {
    assert.equal(isValidCountryCode(code), false);
  }
});

test('public countries endpoint returns the exact validation list', async (t) => {
  const app = express();
  app.use('/api/auth', authRoutes);
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));
  const result = await fetch(`http://127.0.0.1:${server.address().port}/api/auth/countries`);
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { success: true, data: { countries: COUNTRY_CODES } });
});

test('registration rejects invalid fields before database access', async (t) => {
  const find = t.mock.method(User, 'findOne', () => { throw new Error('unexpected database query'); });
  const invalid = [
    { name: '   ' }, { name: {} }, { name: 'x'.repeat(101) },
    { fatherName: '' }, { fatherName: {} }, { fatherName: 'x'.repeat(101) },
    { gender: 'Male' }, { gender: null }, { dateOfBirth: undefined },
    { dateOfBirth: null }, { dateOfBirth: '' }, { dateOfBirth: '1900-02-29' },
    { dateOfBirth: '2023-02-29' }, { dateOfBirth: '2024-04-31' },
    { dateOfBirth: '0000-01-01' }, { dateOfBirth: '2024-2-01' },
    { dateOfBirth: '2024-01-01T00:00:00Z' }, { dateOfBirth: 20000101 },
    { dateOfBirth: '9999-12-31' }, { country: 'ZZ' },
    { country: 'EU' }, { country: 'gb' }, { country: {} },
    { email: 'bad' }, { email: { $ne: null } }, { password: 'weak' },
    { referralCode: ' ' }, { referralCode: { $ne: null } },
  ];
  for (const change of invalid) {
    const res = await invoke(registerUser, { ...validRegistration, ...change });
    assert.equal(res.statusCode, 400, JSON.stringify(change));
    assert.equal(res.body.success, false);
  }
  assert.equal(find.mock.callCount(), 0);
});

test('birth dates honor leap years and the UTC+14 date boundary', async (t) => {
  const now = t.mock.method(Date, 'now', () => Date.parse('2024-02-29T09:59:59Z'));
  t.mock.method(User, 'findOne', async () => ({ _id: 'existing' }));
  assert.equal(isValidDateOfBirth('0001-01-01'), true);
  assert.equal(isValidDateOfBirth('2000-02-29'), true);
  assert.equal(isValidDateOfBirth('1900-02-29'), false);
  assert.equal(isValidDateOfBirth('2024-02-29'), true);
  assert.equal(isValidDateOfBirth('2024-03-01'), false);
  const before = await invoke(registerUser, { ...validRegistration, dateOfBirth: '2024-03-01' });
  assert.match(before.body.error, /date of birth/);

  now.mock.mockImplementation(() => Date.parse('2024-02-29T10:00:00Z'));
  assert.equal(isValidDateOfBirth('2024-03-01'), true);
  assert.equal(isValidDateOfBirth('2024-03-02'), false);
  const after = await invoke(registerUser, { ...validRegistration, dateOfBirth: '2024-03-01' });
  assert.match(after.body.error, /already exists/);
});

test('registration stores normalized data and resolves the required referral', async (t) => {
  const previousSecret = process.env.JWT_SECRET;
  const previousSmtpUser = process.env.SMTP_USER;
  const previousSmtpPass = process.env.SMTP_PASS;
  process.env.JWT_SECRET = 'test-secret';
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;
  t.after(() => {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
    if (previousSmtpUser === undefined) delete process.env.SMTP_USER;
    else process.env.SMTP_USER = previousSmtpUser;
    if (previousSmtpPass === undefined) delete process.env.SMTP_PASS;
    else process.env.SMTP_PASS = previousSmtpPass;
  });

  const referrer = { _id: 'referrer-id', role: 'user' };
  const find = t.mock.method(User, 'findOne', async (query) => {
    if (query.email) return null;
    return query.$or[0].referralCode === 'INVITER' ? referrer : null;
  });
  let saved;
  t.mock.method(User, 'create', async (data) => {
    saved = data;
    return { ...data, _id: 'user-id', role: 'user', hasUsedGracePeriod: false };
  });
  t.mock.method(Wallet, 'create', async (data) => data);
  const createReferral = t.mock.method(Referral, 'create', async (data) => data);

  const res = await invoke(registerUser, validRegistration);
  assert.equal(res.statusCode, 201);
  assert.equal(saved.name, 'Jane Doe');
  assert.equal(saved.fatherName, 'John Doe');
  assert.equal(saved.gender, 'prefer_not_to_say');
  assert.equal(saved.dateOfBirth, '2000-02-29');
  assert.equal('age' in saved, false);
  assert.equal(saved.country, 'GB');
  assert.equal(saved.email, 'jane@example.com');
  assert.equal(saved.referredBy, referrer._id);
  assert.equal(await bcrypt.compare(validRegistration.password, saved.password), true);
  assert.equal(res.body.data.user.country, 'GB');
  assert.equal(createReferral.mock.callCount(), 1);
  assert.deepEqual(find.mock.calls[1].arguments[0].$or, [
    { referralCode: 'INVITER' }, { adminReferralCode: 'INVITER' },
  ]);
  const rejected = await invoke(registerUser, { ...validRegistration, referralCode: 'missing' });
  assert.equal(rejected.statusCode, 400);
  assert.match(rejected.body.error, /Invalid referral/);
});

test('model permits legacy users and validates new fields when present', async () => {
  const base = { name: 'Existing', email: 'old@example.com', password: 'abcdefgh', referralCode: 'OLD' };
  await new User(base).validate();
  for (const dateOfBirth of ['0001-01-01', '2000-02-29']) {
    await new User({ ...base, fatherName: 'Father', gender: 'other', dateOfBirth, country: 'US' }).validate();
  }
  for (const gender of ['male', 'female', 'other', 'prefer_not_to_say']) {
    await new User({ ...base, gender }).validate();
  }
  for (const change of [
    { fatherName: ' ' }, { gender: 'unknown' }, { dateOfBirth: '2023-02-29' },
    { dateOfBirth: '9999-12-31' }, { country: 'EU' },
  ]) {
    await assert.rejects(new User({ ...base, ...change }).validate(), undefined, JSON.stringify(change));
  }
});

test('legacy profiles can update registration details individually and retain omitted values', async (t) => {
  const user = {
    _id: 'user-id', name: 'Existing', email: 'old@example.com', role: 'user',
    referralCode: 'OLD', save: async () => {},
  };
  t.mock.method(User, 'findById', async () => user);
  t.mock.method(Wallet, 'findOne', async () => null);

  const legacy = (await invoke(getMe, {})).body.data.user;
  assert.deepEqual([legacy.fatherName, legacy.gender, legacy.dateOfBirth, legacy.country], [null, null, null, null]);
  const first = await invoke(updateProfile, { fatherName: '  Bruce Lee  ', country: 'PK' });
  assert.equal(first.statusCode, 200);
  assert.equal(first.body.data.fatherName, 'Bruce Lee');
  assert.equal(first.body.data.country, 'PK');
  assert.equal(first.body.data.gender, null);
  const second = await invoke(updateProfile, { gender: 'other', dateOfBirth: '2000-02-29' });
  assert.equal(second.statusCode, 200);
  assert.equal(second.body.data.fatherName, 'Bruce Lee');
  assert.equal(second.body.data.country, 'PK');
  const loaded = (await invoke(getMe, {})).body.data.user;
  assert.deepEqual(
    [loaded.fatherName, loaded.gender, loaded.dateOfBirth, loaded.country],
    ['Bruce Lee', 'other', '2000-02-29', 'PK'],
  );
  const oldClient = await invoke(updateProfile, { name: 'Updated' });
  assert.equal(oldClient.body.data.country, 'PK');
  assert.equal(oldClient.body.data.dateOfBirth, '2000-02-29');
});

test('profile rejects invalid personal details without changing the user', async (t) => {
  const find = t.mock.method(User, 'findById', () => { throw new Error('unexpected database query'); });
  for (const change of [
    { fatherName: ' ' }, { fatherName: null }, { fatherName: 'x'.repeat(101) },
    { gender: 'unknown' }, { gender: null }, { dateOfBirth: '2023-02-29' },
    { dateOfBirth: '9999-12-31' }, { dateOfBirth: null },
    { country: 'EU' }, { country: 'pk' }, { country: null },
  ]) {
    const res = await invoke(updateProfile, { name: 'Should not save', ...change });
    assert.equal(res.statusCode, 400, JSON.stringify(change));
    assert.equal(res.body.success, false);
  }
  assert.equal(find.mock.callCount(), 0);
});

test('login, me, and profile responses expose country and handle legacy accounts', async (t) => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'test-secret';
  t.after(() => {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });
  const user = {
    _id: 'user-id', name: 'Jane', email: 'jane@example.com', role: 'user',
    referralCode: 'CODE', country: 'PK', password: await bcrypt.hash('Password1!', 4),
    save: async () => {},
  };
  t.mock.method(User, 'findOne', () => ({ select: async () => user }));
  t.mock.method(User, 'findById', async () => user);
  t.mock.method(Wallet, 'findOne', async () => null);
  const login = async () => invoke(loginUser, { email: user.email, password: 'Password1!' });
  assert.equal((await login()).body.data.user.country, 'PK');
  assert.equal((await invoke(getMe, {})).body.data.user.country, 'PK');
  assert.equal((await invoke(updateProfile, {})).body.data.country, 'PK');
  delete user.country;
  assert.equal((await login()).body.data.user.country, null);
  assert.equal((await invoke(getMe, {})).body.data.user.country, null);
  assert.equal((await invoke(updateProfile, {})).body.data.country, null);
});
