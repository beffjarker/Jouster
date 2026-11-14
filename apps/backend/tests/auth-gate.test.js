/**
 * Deny-by-default API auth gate, CSRF header check and login/logout flow.
 * Run: npm test (from apps/backend) — uses the built-in node:test runner.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');

const PASSWORD = 'correct horse battery staple';

process.env.NODE_ENV = 'test';
process.env.LIFE_MAP_PASSWORD_HASH = bcrypt.hashSync(PASSWORD, 4);
delete process.env.SESSION_STORE;

const app = require('../server');

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => new Promise((resolve) => server.close(resolve)));

const XHR = { 'X-Requested-With': 'XMLHttpRequest' };

function request(path, { method = 'GET', headers = {}, body } = {}) {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: 'manual',
  });
}

function sessionCookie(res) {
  const setCookie = res.headers.get('set-cookie') || '';
  const match = setCookie.match(/jstr\.sid=[^;]+/);
  return match ? match[0] : null;
}

const PROTECTED_GETS = [
  '/api/emails',
  '/api/conversation-history',
  '/api/conversation-history/migration-status',
  '/api/conversation-history/some-id',
  '/api/instagram/user',
  '/api/instagram/user/media',
  '/api/lastfm/recent-tracks',
  '/api/life-map/entries',
  '/api/does-not-exist',
];

test('health check is public', async () => {
  const res = await request('/health');
  assert.equal(res.status, 200);
});

test('every non-allowlisted /api GET returns 401 without a session', async () => {
  for (const path of PROTECTED_GETS) {
    const res = await request(path);
    assert.equal(res.status, 401, `${path} should require auth`);
  }
});

test('state-changing request without X-Requested-With is rejected with 403', async () => {
  const res = await request('/api/auth/login', { method: 'POST', body: { password: PASSWORD } });
  assert.equal(res.status, 403);
});

test('protected write with the header but no session returns 401', async () => {
  const res = await request('/api/life-map/entries', { method: 'POST', headers: XHR, body: {} });
  assert.equal(res.status, 401);
});

test('verify is public and reports unauthenticated', async () => {
  const res = await request('/api/auth/verify');
  assert.equal(res.status, 200);
  assert.equal((await res.json()).authenticated, false);
});

test('wrong password is rejected', async () => {
  const res = await request('/api/auth/login', { method: 'POST', headers: XHR, body: { password: 'nope' } });
  assert.equal(res.status, 401);
  assert.equal(sessionCookie(res), null);
});

test('login grants access; logout revokes it', async () => {
  const login = await request('/api/auth/login', { method: 'POST', headers: XHR, body: { password: PASSWORD } });
  assert.equal(login.status, 200);
  const cookie = sessionCookie(login);
  assert.ok(cookie, 'login should set the session cookie');
  assert.match(login.headers.get('set-cookie'), /HttpOnly/i);
  assert.match(login.headers.get('set-cookie'), /SameSite=Strict/i);

  const verify = await request('/api/auth/verify', { headers: { Cookie: cookie } });
  assert.equal((await verify.json()).authenticated, true);

  const tracks = await request('/api/lastfm/recent-tracks', { headers: { Cookie: cookie } });
  assert.equal(tracks.status, 200);

  const logout = await request('/api/auth/logout', { method: 'POST', headers: { ...XHR, Cookie: cookie } });
  assert.equal(logout.status, 200);

  const afterLogout = await request('/api/lastfm/recent-tracks', { headers: { Cookie: cookie } });
  assert.equal(afterLogout.status, 401);
});
