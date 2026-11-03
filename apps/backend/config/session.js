/**
 * Session configuration.
 *
 * Deployed environments (production / staging / nonprod) fail closed: the server
 * refuses to start without a strong SESSION_SECRET or a persistent DynamoDB store,
 * instead of silently falling back to a guessable secret or a per-instance
 * in-memory store.
 *
 * @module config/session
 */

const crypto = require('crypto');

/** Environments that are HTTPS-terminated and must use secure, persistent sessions. */
const DEPLOYED_ENVS = ['production', 'staging', 'nonprod'];

const SESSION_COOKIE_NAME = 'jstr.sid';

/** Rolling idle timeout: the session cookie expires after this much inactivity. */
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

/** Absolute lifetime of an authenticated session, regardless of activity. */
const ABSOLUTE_TIMEOUT_MS = 4 * 60 * 60 * 1000;

const MIN_SECRET_BYTES = 32;

/**
 * @param {NodeJS.ProcessEnv} env
 * @returns {boolean} true when running in an HTTPS-terminated, deployed environment.
 */
function isDeployedEnv(env = process.env) {
  return DEPLOYED_ENVS.includes(env.NODE_ENV);
}

/**
 * Resolve the session signing secret.
 * Deployed: SESSION_SECRET is required and must be at least 32 bytes.
 * Local/test: a random per-process secret is generated when unset.
 *
 * @param {NodeJS.ProcessEnv} env
 * @returns {string}
 */
function resolveSessionSecret(env = process.env) {
  const secret = env.SESSION_SECRET;

  if (isDeployedEnv(env)) {
    if (!secret || Buffer.byteLength(secret, 'utf8') < MIN_SECRET_BYTES) {
      throw new Error(
        `SESSION_SECRET must be set to at least ${MIN_SECRET_BYTES} bytes when NODE_ENV=${env.NODE_ENV}`,
      );
    }
    return secret;
  }

  if (secret) {
    return secret;
  }

  console.warn('SESSION_SECRET not set; using a random per-process secret (local development only).');
  return crypto.randomBytes(MIN_SECRET_BYTES).toString('hex');
}

/**
 * Build the persistent session store.
 * Deployed: SESSION_STORE=dynamodb is required and init failures are fatal.
 * Local/test: DynamoDB is optional; failures fall back to the in-memory store.
 *
 * @param {Function} session express-session
 * @param {NodeJS.ProcessEnv} env
 * @returns {object|undefined} a session store, or undefined for the in-memory default
 */
function buildSessionStore(session, env = process.env) {
  const deployed = isDeployedEnv(env);

  if (env.SESSION_STORE !== 'dynamodb') {
    if (deployed) {
      throw new Error(`SESSION_STORE=dynamodb is required when NODE_ENV=${env.NODE_ENV}`);
    }
    return undefined;
  }

  try {
    const DynamoDBStore = require('connect-dynamodb')(session);
    const store = new DynamoDBStore({
      // connect-dynamodb v3 builds an AWS SDK v3 client that reads AWS_REGION.
      table: env.SESSION_TABLE_NAME || 'jouster-sessions',
      hashKey: 'id',
      reapInterval: 24 * 60 * 60 * 1000,
    });
    console.log('🔐 Session store: DynamoDB');
    return store;
  } catch (err) {
    if (deployed) {
      throw new Error(`Failed to initialize DynamoDB session store: ${err.message}`);
    }
    console.error('Failed to init DynamoDB session store, using in-memory store:', err.message);
    return undefined;
  }
}

/**
 * Build express-session options.
 *
 * @param {Function} session express-session
 * @param {NodeJS.ProcessEnv} env
 * @returns {import('express-session').SessionOptions}
 */
function buildSessionOptions(session, env = process.env) {
  const options = {
    name: SESSION_COOKIE_NAME,
    secret: resolveSessionSecret(env),
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: isDeployedEnv(env),
      sameSite: 'strict',
      path: '/',
      maxAge: IDLE_TIMEOUT_MS,
    },
  };

  const store = buildSessionStore(session, env);
  if (store) {
    options.store = store;
  }

  return options;
}

module.exports = {
  ABSOLUTE_TIMEOUT_MS,
  DEPLOYED_ENVS,
  IDLE_TIMEOUT_MS,
  MIN_SECRET_BYTES,
  SESSION_COOKIE_NAME,
  buildSessionOptions,
  buildSessionStore,
  isDeployedEnv,
  resolveSessionSecret,
};
