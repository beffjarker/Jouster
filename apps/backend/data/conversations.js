/**
 * Conversation history data layer.
 *
 * Abstracts the storage backend for conversation history so the rest of the app
 * doesn't care where the data lives:
 *   - When USE_DYNAMODB=true and DYNAMODB_TABLE is set (preview / cloud), reads
 *     from a shared "dev" DynamoDB table seeded with fake data.
 *   - Otherwise (local development), falls back to reading the bundled
 *     session-*.json files in ../conversation-history.
 *
 * DynamoDB item schema (matches terraform/main.tf):
 *   hash  conversationId : S
 *   range timestamp      : N   (epoch ms of startTime)
 *   plus: title, project, startTime, endTime, messageCount, messages[]
 */

const useDynamo = () =>
  process.env.USE_DYNAMODB === 'true' && !!process.env.DYNAMODB_TABLE;

let _docClient = null;
const docClient = () => {
  if (!_docClient) {
    // aws-sdk v2 is already a backend dependency; DocumentClient keeps parity
    // with the inline Lambda defined in terraform/main.tf.
    const AWS = require('aws-sdk');
    _docClient = new AWS.DynamoDB.DocumentClient({
      region: process.env.AWS_REGION || 'us-west-2',
    });
  }
  return _docClient;
};

const toSummary = (c) => ({
  conversationId: c.conversationId,
  title: c.title,
  project: c.project || 'Jouster',
  startTime: c.startTime,
  endTime: c.endTime,
  messageCount: Array.isArray(c.messages) ? c.messages.length : c.messageCount || 0,
});

const byStartTimeDesc = (a, b) => new Date(b.startTime) - new Date(a.startTime);

// ----- DynamoDB backend -----

async function listFromDynamo() {
  const params = { TableName: process.env.DYNAMODB_TABLE };
  const items = [];
  let lastKey;
  do {
    if (lastKey) params.ExclusiveStartKey = lastKey;
    const res = await docClient().scan(params).promise();
    items.push(...(res.Items || []));
    lastKey = res.LastEvaluatedKey;
  } while (lastKey);
  return items.map(toSummary).sort(byStartTimeDesc);
}

async function getFromDynamo(id) {
  const res = await docClient()
    .query({
      TableName: process.env.DYNAMODB_TABLE,
      KeyConditionExpression: 'conversationId = :id',
      ExpressionAttributeValues: { ':id': id },
      Limit: 1,
    })
    .promise();
  return (res.Items && res.Items[0]) || null;
}

// ----- JSON-file backend (local dev fallback) -----

function readJsonFiles() {
  const fs = require('fs');
  const path = require('path');
  const dir = path.join(__dirname, '..', 'conversation-history');
  if (!fs.existsSync(dir)) return [];
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith('session-') && f.endsWith('.json'));
  const out = [];
  for (const file of files) {
    try {
      out.push(JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')));
    } catch (e) {
      console.warn(`Error reading conversation file ${file}:`, e.message);
    }
  }
  return out;
}

// ----- Public API -----

async function listConversations() {
  if (useDynamo()) return listFromDynamo();
  return readJsonFiles().map(toSummary).sort(byStartTimeDesc);
}

async function getConversation(id) {
  if (useDynamo()) return getFromDynamo(id);
  return readJsonFiles().find((c) => c.conversationId === id) || null;
}

function source() {
  return useDynamo()
    ? `DynamoDB table ${process.env.DYNAMODB_TABLE}`
    : 'JSON files (local dev)';
}

module.exports = { listConversations, getConversation, source, useDynamo };
