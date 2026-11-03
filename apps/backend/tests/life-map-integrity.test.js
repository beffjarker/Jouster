/**
 * CORS wildcard matching, life-map update validation and optimistic concurrency.
 * Run: npm test (from apps/backend) — uses the built-in node:test runner.
 */
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const AWS = require('aws-sdk');

process.env.NODE_ENV = 'test';

// In-memory DocumentClient stub honouring the condition used by PUT /entries/:id.
const table = new Map();
const awsResult = (fn) => ({ promise: async () => fn() });
AWS.DynamoDB.DocumentClient.prototype.get = function get({ Key }) {
  const snapshot = table.has(Key.id) ? { Item: { ...table.get(Key.id) } } : {};
  return awsResult(() => snapshot);
};
AWS.DynamoDB.DocumentClient.prototype.put = function put({ Item, ConditionExpression, ExpressionAttributeValues }) {
  return awsResult(() => {
    const current = table.get(Item.id);
    const prev = ExpressionAttributeValues && ExpressionAttributeValues[':prevUpdatedAt'];
    const conditionFails =
      (ConditionExpression || '').includes('attribute_exists(id)') &&
      (!current || (prev !== undefined && current.updatedAt !== prev));
    if (conditionFails) {
      const err = new Error('The conditional request failed');
      err.code = 'ConditionalCheckFailedException';
      throw err;
    }
    table.set(Item.id, { ...Item });
    return {};
  });
};

const { originMatches } = require('../config/cors');
const lifeMapRouter = require('../routes/life-map');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use((req, _res, next) => {
  req.session = { authenticated: true, authenticatedAt: new Date().toISOString() };
  next();
});
app.use('/api/life-map', lifeMapRouter);

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => new Promise((resolve) => server.close(resolve)));

const SEED = {
  id: 'entry-1',
  title: 'Seed',
  date: '2020-01-01',
  category: 'travel',
  location: { lat: 45.5, lng: -122.6, city: 'Portland' },
  createdAt: '2020-01-01T00:00:00.000Z',
  updatedAt: '2020-01-01T00:00:00.000Z',
};

beforeEach(() => {
  table.clear();
  table.set(SEED.id, { ...SEED });
});

function put(id, body) {
  return fetch(`${baseUrl}/api/life-map/entries/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    body: JSON.stringify(body),
  });
}

test('image uploads over the 4 MiB limit are rejected before decoding', async () => {
  const { MAX_IMAGE_BYTES } = require('../middleware/life-map-validation');
  const oversized = `data:image/png;base64,${'A'.repeat(Math.ceil((MAX_IMAGE_BYTES + 1024) / 3) * 4)}`;
  const res = await fetch(`${baseUrl}/api/life-map/images`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    body: JSON.stringify({ data: oversized }),
  });
  assert.equal(res.status, 400);
  assert.match((await res.json()).details[0].message, /4MB/);
});

test('wildcard CORS entries enforce port as well as protocol and host suffix', () => {
  const allowed = 'https://*.jouster.org';
  assert.equal(originMatches(new URL('https://qa.jouster.org'), allowed), true);
  assert.equal(originMatches(new URL('https://qa.jouster.org:443'), allowed), true);
  assert.equal(originMatches(new URL('https://qa.jouster.org:8443'), allowed), false);
  assert.equal(originMatches(new URL('http://qa.jouster.org'), allowed), false);
  assert.equal(originMatches(new URL('https://evil-jouster.org'), allowed), false);
  assert.equal(originMatches(new URL('http://localhost:4200'), 'http://localhost:4200'), true);
  assert.equal(originMatches(new URL('http://localhost:4201'), 'http://localhost:4200'), false);
});

test('PUT with a location lacking coordinates is rejected and leaves stored data intact', async () => {
  const res = await put(SEED.id, { location: { city: 'Seattle' } });
  assert.equal(res.status, 400);
  assert.deepEqual(table.get(SEED.id).location, SEED.location);
});

test('PUT without a location still allows partial updates', async () => {
  const res = await put(SEED.id, { title: 'Renamed' });
  assert.equal(res.status, 200);
  assert.equal(table.get(SEED.id).title, 'Renamed');
  assert.deepEqual(table.get(SEED.id).location, SEED.location);
});

test('PUT returns 409 instead of resurrecting an entry deleted mid-update', async () => {
  const realGet = AWS.DynamoDB.DocumentClient.prototype.get;
  AWS.DynamoDB.DocumentClient.prototype.get = function getThenDelete(params) {
    const result = realGet.call(this, params);
    table.delete(params.Key.id);
    return result;
  };
  try {
    const res = await put(SEED.id, { title: 'Ghost' });
    assert.equal(res.status, 409);
    assert.equal(table.has(SEED.id), false);
  } finally {
    AWS.DynamoDB.DocumentClient.prototype.get = realGet;
  }
});

test('PUT returns 409 when the entry changed after it was read', async () => {
  const realGet = AWS.DynamoDB.DocumentClient.prototype.get;
  AWS.DynamoDB.DocumentClient.prototype.get = function getThenTouch(params) {
    const result = realGet.call(this, params);
    table.set(params.Key.id, { ...table.get(params.Key.id), updatedAt: '2021-01-01T00:00:00.000Z' });
    return result;
  };
  try {
    const res = await put(SEED.id, { title: 'Stale' });
    assert.equal(res.status, 409);
    assert.equal(table.get(SEED.id).title, 'Seed');
  } finally {
    AWS.DynamoDB.DocumentClient.prototype.get = realGet;
  }
});
