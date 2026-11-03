/**
 * Unit tests for session config (fail-closed in deployed envs), absolute session
 * timeout, the public API allowlist and the Secrets Manager env loader.
 * Run: npm test (from apps/backend) — uses the built-in node:test runner.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const session = require('express-session');

const {
  ABSOLUTE_TIMEOUT_MS,
  IDLE_TIMEOUT_MS,
  buildSessionOptions,
} = require('../config/session');
const { isPublicApiRoute, isSessionAuthenticated, requireAuth } = require('../middleware/auth-guard');
const { loadSecretsIntoEnv } = require('../config/secrets');

const STRONG_SECRET = 'a'.repeat(64);

test('deployed envs refuse to start without SESSION_SECRET', () => {
  for (const NODE_ENV of ['production', 'staging', 'nonprod']) {
    assert.throws(() => buildSessionOptions(session, { NODE_ENV, SESSION_STORE: 'dynamodb' }), /SESSION_SECRET/);
  }
});

test('deployed envs refuse a short SESSION_SECRET', () => {
  assert.throws(
    () => buildSessionOptions(session, { NODE_ENV: 'production', SESSION_SECRET: 'short', SESSION_STORE: 'dynamodb' }),
    /SESSION_SECRET/,
  );
});

test('deployed envs refuse the in-memory session store', () => {
  assert.throws(
    () => buildSessionOptions(session, { NODE_ENV: 'nonprod', SESSION_SECRET: STRONG_SECRET }),
    /SESSION_STORE=dynamodb/,
  );
});

test('deployed env with secret + DynamoDB store builds secure options', () => {
  const options = buildSessionOptions(session, {
    NODE_ENV: 'production',
    SESSION_SECRET: STRONG_SECRET,
    SESSION_STORE: 'dynamodb',
    SESSION_TABLE_NAME: 'jouster-sessions-test',
  });
  assert.equal(options.cookie.secure, true);
  assert.equal(options.cookie.httpOnly, true);
  assert.equal(options.cookie.sameSite, 'strict');
  assert.equal(options.cookie.maxAge, IDLE_TIMEOUT_MS);
  assert.equal(options.rolling, true);
  assert.ok(options.store, 'DynamoDB store should be configured');
  clearInterval(options.store._reap);
});

test('local dev without a secret gets a random, non-literal secret', () => {
  const a = buildSessionOptions(session, { NODE_ENV: 'development' });
  const b = buildSessionOptions(session, { NODE_ENV: 'development' });
  assert.notEqual(a.secret, 'fallback-dev-secret');
  assert.notEqual(a.secret, b.secret);
  assert.equal(a.cookie.secure, false);
});

test('public API allowlist is exact', () => {
  assert.equal(isPublicApiRoute({ method: 'POST', path: '/auth/login' }), true);
  assert.equal(isPublicApiRoute({ method: 'GET', path: '/auth/verify' }), true);
  assert.equal(isPublicApiRoute({ method: 'HEAD', path: '/auth/verify' }), true);
  assert.equal(isPublicApiRoute({ method: 'GET', path: '/auth/login' }), false);
  assert.equal(isPublicApiRoute({ method: 'GET', path: '/auth/verify/extra' }), false);
  assert.equal(isPublicApiRoute({ method: 'GET', path: '/emails' }), false);
});

test('sessions older than the absolute timeout are not authenticated', () => {
  const now = Date.now();
  const fresh = { session: { authenticated: true, authenticatedAt: new Date(now - 60_000).toISOString() } };
  const stale = {
    session: { authenticated: true, authenticatedAt: new Date(now - ABSOLUTE_TIMEOUT_MS - 1).toISOString() },
  };
  const missingTimestamp = { session: { authenticated: true } };
  assert.equal(isSessionAuthenticated(fresh, now), true);
  assert.equal(isSessionAuthenticated(stale, now), false);
  assert.equal(isSessionAuthenticated(missingTimestamp, now), false);
});

test('requireAuth destroys an expired session and returns 401', async () => {
  let destroyed = false;
  let clearedCookie = null;
  let status = null;
  const req = {
    session: {
      authenticated: true,
      authenticatedAt: new Date(Date.now() - ABSOLUTE_TIMEOUT_MS - 1).toISOString(),
      destroy(cb) {
        destroyed = true;
        cb();
      },
    },
  };
  const res = {
    clearCookie(name) {
      clearedCookie = name;
    },
    status(code) {
      status = code;
      return this;
    },
    json() {
      return this;
    },
  };
  let nextCalled = false;
  requireAuth(req, res, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, false);
  assert.equal(destroyed, true);
  assert.equal(clearedCookie, 'jstr.sid');
  assert.equal(status, 401);
});

test('loadSecretsIntoEnv merges JSON secrets without overwriting existing vars', async () => {
  const env = { SECRETS_ARNS: 'arn:one, arn:two', EXISTING: 'keep' };
  const secrets = {
    'arn:one': JSON.stringify({ SESSION_SECRET: STRONG_SECRET, EXISTING: 'overwrite?' }),
    'arn:two': JSON.stringify({ LIFE_MAP_PASSWORD_HASH: '$2b$12$hash' }),
  };
  const client = {
    getSecretValue: ({ SecretId }) => ({ promise: async () => ({ SecretString: secrets[SecretId] }) }),
  };
  const loaded = await loadSecretsIntoEnv(env, client);
  assert.deepEqual(loaded.sort(), ['LIFE_MAP_PASSWORD_HASH', 'SESSION_SECRET']);
  assert.equal(env.EXISTING, 'keep');
  assert.equal(env.SESSION_SECRET, STRONG_SECRET);
});

test('loadSecretsIntoEnv is a no-op without SECRETS_ARNS and rejects non-JSON secrets', async () => {
  assert.deepEqual(await loadSecretsIntoEnv({}), []);
  const client = { getSecretValue: () => ({ promise: async () => ({ SecretString: 'not-json' }) }) };
  await assert.rejects(loadSecretsIntoEnv({ SECRETS_ARNS: 'arn:x' }, client), /JSON object/);
});
