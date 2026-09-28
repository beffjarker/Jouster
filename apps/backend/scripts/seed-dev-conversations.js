/**
 * Seed the shared "dev" DynamoDB conversations table with fake data.
 *
 * Safe to run repeatedly (idempotent): creates the table if it does not exist,
 * waits until it is ACTIVE, then upserts a fixed set of fake conversations.
 *
 * Contains NO real conversation data / PII — only synthetic content so public
 * per-PR previews have realistic-looking data with full functionality.
 *
 * Env:
 *   DYNAMODB_TABLE   table name (default: dev-jouster-conversations)
 *   AWS_REGION       AWS region  (default: us-west-2)
 *
 * Usage:  node apps/backend/scripts/seed-dev-conversations.js
 */

const AWS = require('aws-sdk');

const REGION = process.env.AWS_REGION || 'us-west-2';
const TABLE = process.env.DYNAMODB_TABLE || 'dev-jouster-conversations';

const dynamo = new AWS.DynamoDB({ region: REGION });
const docClient = new AWS.DynamoDB.DocumentClient({ region: REGION });

const ms = (iso) => new Date(iso).getTime();

function buildFakeConversations() {
  return [
    {
      conversationId: 'conv_dev_001',
      title: 'Adding the Interactive Playground page',
      project: 'Jouster',
      startTime: '2026-02-01T15:04:00.000Z',
      endTime: '2026-02-01T15:41:00.000Z',
      messages: [
        { messageId: 'm1', role: 'user', content: 'Rename the Flash Experiments page to Interactive Playground.', timestamp: ms('2026-02-01T15:04:00.000Z') },
        { messageId: 'm2', role: 'assistant', content: 'Updated the heading, intro copy, and kept a Historical Experiments section below.', timestamp: ms('2026-02-01T15:06:00.000Z') },
        { messageId: 'm3', role: 'user', content: 'Great, ship it to a preview.', timestamp: ms('2026-02-01T15:40:00.000Z') },
        { messageId: 'm4', role: 'assistant', content: 'Preview deployed and verified live.', timestamp: ms('2026-02-01T15:41:00.000Z') },
      ],
      summary: {
        mainTopics: ['UI rename', 'Preview pipeline'],
        keyAchievements: ['Renamed page', 'Verified preview deploy'],
        nextSteps: ['Merge to main'],
      },
    },
    {
      conversationId: 'conv_dev_002',
      title: 'Per-branch AWS preview environments',
      project: 'Jouster',
      startTime: '2026-02-03T09:12:00.000Z',
      endTime: '2026-02-03T10:05:00.000Z',
      messages: [
        { messageId: 'm1', role: 'user', content: 'I want a preview environment when I push a branch.', timestamp: ms('2026-02-03T09:12:00.000Z') },
        { messageId: 'm2', role: 'assistant', content: 'Building Express-on-Lambda + API Gateway per PR, backed by a shared dev DynamoDB.', timestamp: ms('2026-02-03T09:20:00.000Z') },
        { messageId: 'm3', role: 'user', content: 'Point it at dev data with full functionality.', timestamp: ms('2026-02-03T10:04:00.000Z') },
        { messageId: 'm4', role: 'assistant', content: 'Runtime config.json drives the API base URL; dev DynamoDB is seeded with fake data.', timestamp: ms('2026-02-03T10:05:00.000Z') },
      ],
      summary: {
        mainTopics: ['Preview environments', 'Serverless backend', 'DynamoDB'],
        keyAchievements: ['Lambda-ized backend', 'Runtime FE config'],
        nextSteps: ['Wire deploy + teardown workflows'],
      },
    },
    {
      conversationId: 'conv_dev_003',
      title: 'Voice-driven git workflow',
      project: 'Jouster',
      startTime: '2026-01-20T18:30:00.000Z',
      endTime: '2026-01-20T19:15:00.000Z',
      messages: [
        { messageId: 'm1', role: 'user', content: 'Have Home Assistant check branches in a repo by voice.', timestamp: ms('2026-01-20T18:30:00.000Z') },
        { messageId: 'm2', role: 'assistant', content: 'Wired an agent that maps intents to git commands over the shared folder.', timestamp: ms('2026-01-20T19:15:00.000Z') },
      ],
      summary: {
        mainTopics: ['Home Assistant', 'Voice', 'git'],
        keyAchievements: ['Branch listing by voice'],
        nextSteps: ['Add commit and rebase intents'],
      },
    },
  ];
}

async function tableExists() {
  try {
    await dynamo.describeTable({ TableName: TABLE }).promise();
    return true;
  } catch (err) {
    if (err.code === 'ResourceNotFoundException') return false;
    throw err;
  }
}

async function createTable() {
  console.log(`Creating table ${TABLE} ...`);
  await dynamo
    .createTable({
      TableName: TABLE,
      BillingMode: 'PAY_PER_REQUEST',
      AttributeDefinitions: [
        { AttributeName: 'conversationId', AttributeType: 'S' },
        { AttributeName: 'timestamp', AttributeType: 'N' },
      ],
      KeySchema: [
        { AttributeName: 'conversationId', KeyType: 'HASH' },
        { AttributeName: 'timestamp', KeyType: 'RANGE' },
      ],
      Tags: [
        { Key: 'project', Value: 'jouster' },
        { Key: 'environment', Value: 'dev' },
        { Key: 'purpose', Value: 'preview-shared-dev-data' },
      ],
    })
    .promise();
  console.log('Waiting for table to become ACTIVE ...');
  await dynamo.waitFor('tableExists', { TableName: TABLE }).promise();
}

async function seed() {
  const items = buildFakeConversations();
  for (const item of items) {
    await docClient
      .put({
        TableName: TABLE,
        Item: {
          ...item,
          timestamp: ms(item.startTime),
          messageCount: item.messages.length,
        },
      })
      .promise();
    console.log(`  seeded ${item.conversationId} - ${item.title}`);
  }
}

(async () => {
  console.log(`Seeding ${TABLE} in ${REGION}`);
  if (!(await tableExists())) {
    await createTable();
  } else {
    console.log(`Table ${TABLE} already exists.`);
  }
  await seed();
  console.log('Done.');
})().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
