import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import User from '../models/User.js';
import userRoutes from '../routes/userRoutes.js';
import { uploadProfilePicture } from '../middleware/uploadProfilePicture.js';
import { getProfilePicture, updateProfilePicture } from '../controllers/userController.js';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lX8AAAAASUVORK5CYII=', 'base64');
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);

test('profile pictures require authentication and support private replacement', async (t) => {
  const pictures = new Map();
  t.mock.method(User, 'findByIdAndUpdate', async (id, update) => {
    pictures.set(id, update.$set);
    return { _id: id };
  });
  t.mock.method(User, 'findById', (id) => ({
    select: async () => ({ _id: id, ...pictures.get(id) }),
  }));
  const app = express();
  app.use('/api/user', userRoutes);
  app.use('/test', (req, res, next) => {
    req.user = { _id: req.get('x-test-user') || 'user-a' };
    next();
  });
  app.get('/test/profile-picture', getProfilePicture);
  app.put('/test/profile-picture', uploadProfilePicture, updateProfilePicture);
  app.use((err, req, res, next) => res.status(500).json({ error: err.message }));

  const server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  const base = `http://127.0.0.1:${server.address().port}`;
  const upload = (bytes, type, field = 'picture') => {
    const form = new FormData();
    form.append(field, new Blob([bytes], { type }), 'picture');
    return fetch(`${base}/test/profile-picture`, { method: 'PUT', body: form });
  };

  assert.equal((await fetch(`${base}/api/user/profile-picture`)).status, 401);
  assert.equal((await fetch(`${base}/api/user/profile-picture`, { method: 'PUT', body: new FormData() })).status, 401);
  assert.equal(User.schema.path('profilePicture').options.select, false);
  assert.equal(User.schema.path('profilePictureType').options.select, false);
  assert.equal((await fetch(`${base}/test/profile-picture`)).status, 404);
  assert.equal((await fetch(`${base}/test/profile-picture`, { method: 'PUT', body: new FormData() })).status, 400);
  assert.equal((await upload(png, 'image/jpeg')).status, 400);
  assert.equal((await upload(Buffer.from('not an image'), 'image/png')).status, 400);
  assert.equal((await upload(png, 'image/png', 'unexpected')).status, 400);
  assert.equal((await upload(Buffer.alloc(512 * 1024 + 1), 'image/png')).status, 413);
  assert.equal((await upload(png, 'image/png')).status, 200);
  const first = await fetch(`${base}/test/profile-picture`);
  assert.equal(first.status, 200);
  assert.equal(first.headers.get('content-type'), 'image/png');
  assert.equal(first.headers.get('cache-control'), 'private, no-store');
  assert.deepEqual(Buffer.from(await first.arrayBuffer()), png);
  assert.equal((await upload(Buffer.from('invalid'), 'image/png')).status, 400);
  assert.deepEqual(Buffer.from(await (await fetch(`${base}/test/profile-picture`)).arrayBuffer()), png);
  assert.equal((await fetch(`${base}/test/profile-picture`, { headers: { 'x-test-user': 'user-b' } })).status, 404);
  assert.equal((await upload(jpeg, 'image/jpeg')).status, 200);
  const replaced = await fetch(`${base}/test/profile-picture`);
  assert.equal(replaced.headers.get('content-type'), 'image/jpeg');
  assert.deepEqual(Buffer.from(await replaced.arrayBuffer()), jpeg);
});
