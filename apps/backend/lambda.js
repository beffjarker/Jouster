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
 */

const serverless = require('serverless-http');
const app = require('./server');

const handler = serverless(app, {
  // API Gateway may serve the app under a stage path (e.g. /preview); strip it
  // so Express routes ('/api/...') match regardless of the deployed stage.
  basePath: process.env.API_BASE_PATH || undefined,
});

module.exports.handler = handler;
