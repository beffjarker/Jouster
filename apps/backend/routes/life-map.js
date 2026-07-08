/**
 * Life Map API Routes
 * Serves journal entries from DynamoDB and presigned image URLs from S3.
 * All routes are protected by session-based authentication.
 *
 * Routes:
 *   GET /api/life-map/entries       - Get all entries
 *   GET /api/life-map/entries/:id   - Get single entry by ID
 *   GET /api/life-map/images/:filename - Get presigned S3 URL for image
 *
 * @module routes/life-map
 */

const express = require('express');
const AWS = require('aws-sdk');
const axios = require('axios');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { requireAuth } = require('../middleware/auth-guard');
const {
  validateCreateEntry,
  validateUpdateEntry,
  validateEntryId,
  validateGeocodeQuery,
  validateImageUpload,
} = require('../middleware/life-map-validation');

const router = express.Router();

// Apply auth guard to all life-map routes
router.use(requireAuth);

/**
 * Defense-in-depth CSRF mitigation for state-changing requests. Combined with the
 * session cookie's `sameSite: 'strict'`, requiring this custom header (which the
 * Angular client sets, but a cross-site HTML form cannot) blocks CSRF on writes.
 */
function requireWriteHeader(req, res, next) {
  if (req.get('X-Requested-With') !== 'XMLHttpRequest') {
    return res.status(403).json({ success: false, message: 'Missing required header' });
  }
  next();
}

/**
 * Append-only audit log for write operations (accountability).
 */
function auditLog(req, action, entryId, extra = {}) {
  console.log(JSON.stringify({
    audit: 'life-map',
    action,
    entryId,
    at: new Date().toISOString(),
    sessionAuthedAt: (req.session && req.session.authenticatedAt) || null,
    ip: req.ip,
    ...extra,
  }));
}

/**
 * Pick only the defined, allowed fields from a request body (for partial updates).
 */
function pickAllowed(source, keys) {
  const out = {};
  for (const key of keys) {
    if (source[key] !== undefined) out[key] = source[key];
  }
  return out;
}

const ENTRY_FIELDS = ['title', 'description', 'date', 'category', 'location', 'images', 'tags'];

// DynamoDB client — uses local endpoint if DYNAMODB_ENDPOINT is set
const dynamoConfig = {
  region: process.env.AWS_REGION || 'us-west-2',
};

if (process.env.DYNAMODB_ENDPOINT) {
  dynamoConfig.endpoint = process.env.DYNAMODB_ENDPOINT;
  dynamoConfig.accessKeyId = 'dummy';
  dynamoConfig.secretAccessKey = 'dummy';
  console.log(`Life Map: Using local DynamoDB at ${process.env.DYNAMODB_ENDPOINT}`);
}

const docClient = new AWS.DynamoDB.DocumentClient(dynamoConfig);

// S3 client for presigned URLs (only used in deployed environments)
const s3 = new AWS.S3({
  region: process.env.S3_REGION || process.env.AWS_REGION || 'us-west-2',
});

const TABLE_NAME = process.env.LIFE_MAP_TABLE_NAME || 'jouster-life-map-dev';
const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'jouster-dev-bucket';
const IMAGE_PREFIX = 'life-map/images/';
const PRESIGNED_URL_EXPIRY = 900; // 15 minutes
const IS_LOCAL = !!process.env.DYNAMODB_ENDPOINT;

/**
 * GET /api/life-map/entries
 * Returns all life map entries sorted by date.
 */
router.get('/entries', async (req, res) => {
  try {
    let items = [];
    let lastKey = null;

    do {
      const params = { TableName: TABLE_NAME };
      if (lastKey) params.ExclusiveStartKey = lastKey;

      const result = await docClient.scan(params).promise();
      items = items.concat(result.Items);
      lastKey = result.LastEvaluatedKey;
    } while (lastKey);

    // Sort by date ascending
    items.sort((a, b) => new Date(a.date) - new Date(b.date));

    return res.json({
      success: true,
      data: items,
      total: items.length,
    });
  } catch (error) {
    console.error('Life map entries error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch entries',
    });
  }
});

/**
 * GET /api/life-map/entries/:id
 * Returns a single entry by ID.
 */
router.get('/entries/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await docClient.get({
      TableName: TABLE_NAME,
      Key: { id },
    }).promise();

    if (!result.Item) {
      return res.status(404).json({
        success: false,
        message: 'Entry not found',
      });
    }

    return res.json({
      success: true,
      data: result.Item,
    });
  } catch (error) {
    console.error('Life map entry error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch entry',
    });
  }
});

/**
 * GET /api/life-map/images/:filename
 * - Local dev: serves SVG placeholder from scripts/assets/placeholders/
 * - Deployed: returns a presigned S3 URL (15-min expiry)
 */
router.get('/images/:filename', async (req, res) => {
  try {
    const { filename } = req.params;

    // Validate filename format (allow jpg/png/svg, no path traversal)
    if (!/^[\w\-]+\.(jpg|jpeg|png|svg)$/i.test(filename)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid filename format',
      });
    }

    // Local dev: serve placeholder SVG
    if (IS_LOCAL) {
      const placeholderDir = path.join(__dirname, '../scripts/assets/placeholders');
      const placeholderPath = path.join(placeholderDir, filename);
      const fs = require('fs');

      // Try exact filename first, then fall back to category-based placeholder
      if (fs.existsSync(placeholderPath)) {
        return res.sendFile(placeholderPath);
      }

      // Fallback: serve default placeholder
      const defaultPlaceholder = path.join(placeholderDir, 'placeholder-default.svg');
      if (fs.existsSync(defaultPlaceholder)) {
        return res.sendFile(defaultPlaceholder);
      }

      // Ultimate fallback: inline SVG
      res.setHeader('Content-Type', 'image/svg+xml');
      return res.send(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
        <rect width="400" height="300" fill="#1a1a2e"/>
        <text x="200" y="150" text-anchor="middle" fill="#667eea" font-size="14" font-family="monospace">${filename}</text>
        <text x="200" y="175" text-anchor="middle" fill="#555" font-size="11" font-family="monospace">local placeholder</text>
      </svg>`);
    }

    // Deployed: generate S3 presigned URL
    const key = `${IMAGE_PREFIX}${filename}`;

    const url = s3.getSignedUrl('getObject', {
      Bucket: BUCKET_NAME,
      Key: key,
      Expires: PRESIGNED_URL_EXPIRY,
    });

    return res.json({
      success: true,
      url,
      expires: PRESIGNED_URL_EXPIRY,
    });
  } catch (error) {
    console.error('Life map image error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate image URL',
    });
  }
});

/**
 * GET /api/life-map/geocode?q=...
 * Server-side address → coordinates lookup via OpenStreetMap Nominatim.
 * Proxied through the backend so the browser only ever talks to /api (CSP-safe)
 * and the lookup stays behind auth + rate limiting.
 */
router.get('/geocode', validateGeocodeQuery, async (req, res) => {
  try {
    const { q } = req.query;

    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: { format: 'json', q, limit: 5, addressdetails: 1 },
      headers: { 'User-Agent': 'Jouster-LifeMap/1.0 (https://jouster.org)' },
      timeout: 8000,
    });

    const results = (response.data || []).map((r) => ({
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      displayName: r.display_name,
      city: (r.address && (r.address.city || r.address.town || r.address.village)) || '',
      state: (r.address && r.address.state) || '',
      country: (r.address && r.address.country) || '',
    }));

    return res.json({ success: true, data: results });
  } catch (error) {
    console.error('Geocode error:', error.message);
    return res.status(502).json({ success: false, message: 'Geocoding failed' });
  }
});

/**
 * POST /api/life-map/entries
 * Create a new entry. Auth + write-header + validation required.
 */
router.post('/entries', requireWriteHeader, validateCreateEntry, async (req, res) => {
  try {
    const now = new Date().toISOString();
    const item = {
      id: uuidv4(),
      title: req.body.title,
      description: req.body.description || '',
      date: req.body.date,
      category: req.body.category,
      location: req.body.location,
      images: Array.isArray(req.body.images) ? req.body.images : [],
      tags: Array.isArray(req.body.tags) ? req.body.tags : [],
      createdAt: now,
      updatedAt: now,
    };

    await docClient.put({
      TableName: TABLE_NAME,
      Item: item,
      ConditionExpression: 'attribute_not_exists(id)',
    }).promise();

    auditLog(req, 'create', item.id);
    return res.status(201).json({ success: true, data: item });
  } catch (error) {
    console.error('Life map create error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to create entry' });
  }
});

/**
 * PUT /api/life-map/entries/:id
 * Update an existing entry (partial update of allowed fields).
 */
router.put('/entries/:id', requireWriteHeader, validateUpdateEntry, async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await docClient.get({ TableName: TABLE_NAME, Key: { id } }).promise();
    if (!existing.Item) {
      return res.status(404).json({ success: false, message: 'Entry not found' });
    }

    const updated = {
      ...existing.Item,
      ...pickAllowed(req.body, ENTRY_FIELDS),
      id,
      createdAt: existing.Item.createdAt,
      updatedAt: new Date().toISOString(),
    };

    await docClient.put({ TableName: TABLE_NAME, Item: updated }).promise();

    auditLog(req, 'update', id);
    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Life map update error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to update entry' });
  }
});

/**
 * DELETE /api/life-map/entries/:id
 * Delete an entry.
 */
router.delete('/entries/:id', requireWriteHeader, validateEntryId, async (req, res) => {
  try {
    const { id } = req.params;

    await docClient.delete({ TableName: TABLE_NAME, Key: { id } }).promise();

    auditLog(req, 'delete', id);
    return res.json({ success: true, message: 'Entry deleted' });
  } catch (error) {
    console.error('Life map delete error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to delete entry' });
  }
});

/**
 * POST /api/life-map/images
 * Upload an image as a base64 data URL. Stores to S3 (deployed) or the local
 * placeholder dir (dev), returning the generated filename to attach to an entry.
 */
router.post('/images', requireWriteHeader, validateImageUpload, async (req, res) => {
  try {
    const match = /^data:image\/(jpeg|jpg|png|svg\+xml);base64,(.+)$/.exec(req.body.data);
    if (!match) {
      return res.status(400).json({ success: false, message: 'Invalid image data' });
    }

    const mime = match[1];
    const ext = mime === 'svg+xml' ? 'svg' : (mime === 'jpeg' ? 'jpg' : mime);
    const contentType = mime === 'svg+xml' ? 'image/svg+xml' : `image/${mime === 'jpg' ? 'jpeg' : mime}`;
    const buffer = Buffer.from(match[2], 'base64');

    const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
    if (buffer.length > MAX_BYTES) {
      return res.status(400).json({ success: false, message: 'Image exceeds 5MB limit' });
    }

    const filename = `${uuidv4()}.${ext}`;

    if (IS_LOCAL) {
      const fs = require('fs');
      const dir = path.join(__dirname, '../scripts/assets/placeholders');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, filename), buffer);
    } else {
      await s3.putObject({
        Bucket: BUCKET_NAME,
        Key: `${IMAGE_PREFIX}${filename}`,
        Body: buffer,
        ContentType: contentType,
      }).promise();
    }

    auditLog(req, 'image-upload', filename);
    return res.status(201).json({ success: true, filename });
  } catch (error) {
    console.error('Image upload error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to upload image' });
  }
});

module.exports = router;

