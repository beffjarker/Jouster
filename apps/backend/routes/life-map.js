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
const path = require('path');
const { requireAuth } = require('../middleware/auth-guard');

const router = express.Router();

// Apply auth guard to all life-map routes
router.use(requireAuth);

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

module.exports = router;

