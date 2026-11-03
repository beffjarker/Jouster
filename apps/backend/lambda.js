/**
 * AWS Lambda entry point for the Jouster backend.
 *
 * Wraps the existing Express app (server.js) with serverless-http so the same
 * code runs both as a normal Node server (local/dev/prod container) and as a
 * Lambda function behind API Gateway (per-PR preview environments).
 *
 * Environment variables of interest (set by the preview deploy workflow):
 *   NODE_ENV=development          -> enables mock fallbacks, disables HTTPS redirect
 *   USE_DYNAMODB=true             -> conversation history reads from DynamoDB
 *   DYNAMODB_TABLE=dev-jouster-conversations
 *   CORS_ALLOWED_ORIGINS=http://jouster-preview-prN.s3-website-us-west-2.amazonaws.com
 *   SECRETS_ARNS=arn:...,arn:...  -> Secrets Manager JSON secrets loaded into process.env
 *                                    before the app (and its session config) is built
 *
 * @module lambda
 */

const serverless = require('serverless-http');
const { loadSecretsIntoEnv } = require('./config/secrets');

let handlerPromise = null;

async function init() {
  await loadSecretsIntoEnv(process.env);
  const app = require('./server');
  return serverless(app, {
    // API Gateway may serve the app under a stage path (e.g. /preview); strip it
    // so Express routes ('/api/...') match regardless of the deployed stage.
    basePath: process.env.API_BASE_PATH || undefined,
  });
}

module.exports.handler = async (event, context) => {
  if (!handlerPromise) {
    handlerPromise = init().catch((err) => {
      handlerPromise = null;
      throw err;
    });
  }
  const handler = await handlerPromise;
  return handler(event, context);
};
