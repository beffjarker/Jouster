/**
 * AWS Lambda entrypoint for the Jouster backend.
 *
 * Wraps the existing Express app with `serverless-http` so the same app runs
 * unchanged behind API Gateway. The app is imported from `server.js`, which only
 * binds an HTTP port when run directly (guarded by `require.main === module`),
 * so importing it here does not start a listener.
 *
 * @module lambda
 */

const serverless = require('serverless-http');
const app = require('./server');

// API Gateway proxy integration → Express. binary support left default (JSON API).
module.exports.handler = serverless(app);

