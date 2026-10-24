import test from 'node:test';
import assert from 'node:assert/strict';
import axiosClient from '../src/api/axiosClient.js';
import { isTokenExpired } from '../src/api/authSession.js';

const values = new Map();
globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
globalThis.window = new EventTarget();
let expiredEvents = 0;
window.addEventListener('auth:expired', () => expiredEvents++);
const jwt = exp => `header.${Buffer.from(JSON.stringify({ exp })).toString('base64url')}.signature`;
const unauthorized = async config => { throw { config, response: { status: 401 } }; };

test('known expiry is checked without claiming signature validation', () => {
  assert.equal(isTokenExpired(jwt(1)), true);
  assert.equal(isTokenExpired(jwt(Date.now() / 1000 + 3600)), false);
  assert.equal(isTokenExpired('malformed'), false);
});
test('expired token never reaches notification adapter', async () => {
  values.set('token', jwt(1));
  let calls = 0;
  await assert.rejects(axiosClient.get('/api/notifications/unread-count', { adapter: async () => { calls++; } }));
  assert.equal(calls, 0);
  assert.equal(localStorage.getItem('token'), null);
});
test('current session 401 clears session once', async () => {
  values.set('token', 'current'); values.set('role', 'USER');
  const before = expiredEvents;
  await assert.rejects(axiosClient.get('/api/notifications/unread-count', { adapter: unauthorized }));
  assert.equal(localStorage.getItem('token'), null);
  assert.equal(localStorage.getItem('role'), null);
  assert.equal(expiredEvents, before + 1);
});
test('late 401 from previous account preserves newly logged in account', async () => {
  values.set('token', 'old');
  const before = expiredEvents;
  await assert.rejects(axiosClient.get('/api/notifications/unread-count', { adapter: async config => {
    values.set('token', 'new');
    return unauthorized(config);
  } }));
  assert.equal(localStorage.getItem('token'), 'new');
  assert.equal(expiredEvents, before);
});
test('login works even when storage contains expired credentials', async () => {
  values.set('token', jwt(1));
  let calls = 0;
  await axiosClient.post('/api/auth/login', {}, { adapter: async config => {
    calls++;
    assert.equal(config.headers.Authorization, undefined);
    return { status: 200, data: {}, config };
  } });
  assert.equal(calls, 1);
});
test('anonymous 401 does not invalidate a concurrent login', async () => {
  values.clear();
  await assert.rejects(axiosClient.get('/api/notifications/unread-count', { adapter: async config => {
    values.set('token', 'new');
    return unauthorized(config);
  } }));
  assert.equal(localStorage.getItem('token'), 'new');
});
