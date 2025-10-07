const express = require('express');
const AWS = require('aws-sdk');
const router = express.Router();

// Configure AWS credentials and region explicitly
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-west-2'
});

// Configure AWS S3
const s3 = new AWS.S3();

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'jouster-dev-bucket';
const EMAIL_PREFIX = process.env.S3_EMAIL_PREFIX || 'email/'; // Use the prefix from .env

// GET /api/emails - List emails from S3 bucket
router.get('/', async (req, res) => {
  try {
    const { pageSize = 100, marker } = req.query;
    const maxKeys = Math.min(parseInt(pageSize), 1000); // AWS limit is 1000

    const params = {
      Bucket: BUCKET_NAME,
      Prefix: EMAIL_PREFIX,
      MaxKeys: maxKeys
    };

    if (marker) {
      params.ContinuationToken = marker;
    }

    console.log('Listing emails from S3 bucket:', BUCKET_NAME);
    const result = await s3.listObjectsV2(params).promise();

    const files = result.Contents.map(obj => ({
      key: obj.Key,
      lastModified: obj.LastModified,
      size: obj.Size,
      displayName: obj.Key.replace(EMAIL_PREFIX, '').replace(/\.[^/.]+$/, '') // Remove prefix and extension
    }));

    const response = {
      files,
      totalCount: result.KeyCount,
      hasMore: result.IsTruncated,
      nextMarker: result.NextContinuationToken
    };

    res.json(response);
  } catch (error) {
    console.error('Error listing emails from S3:', error);
    res.status(500).json({
      error: 'Failed to list emails',
      message: error.message
    });
  }
});

// GET /api/emails/:key/parse - Parse a specific email
router.get('/:key/parse', async (req, res) => {
  try {
    const emailKey = decodeURIComponent(req.params.key);

    console.log('Parsing email:', emailKey);

    const params = {
      Bucket: BUCKET_NAME,
      Key: emailKey
    };

    const result = await s3.getObject(params).promise();
    const emailContent = result.Body.toString('utf-8');

    console.log('Email content length:', emailContent.length);

    // Basic email parsing - this could be enhanced with a proper email parser library
    const parsedEmail = parseEmailContent(emailContent);

    console.log('Parsed email subject:', parsedEmail.subject);

    res.json(parsedEmail);
  } catch (error) {
    console.error('Error parsing email from S3:', error);
    res.status(500).json({
      error: 'Failed to parse email',
      message: error.message
    });
  }
});

// GET /api/emails/:key/download - Get download URL for email
router.get('/:key/download', async (req, res) => {
  try {
    const emailKey = decodeURIComponent(req.params.key);

    const params = {
      Bucket: BUCKET_NAME,
      Key: emailKey,
      Expires: 300 // 5 minutes
    };

    const url = s3.getSignedUrl('getObject', params);

    res.json({ downloadUrl: url });
  } catch (error) {
    console.error('Error generating download URL:', error);
    res.status(500).json({
      error: 'Failed to generate download URL',
      message: error.message
    });
  }
});

// Simple email parser function
function parseEmailContent(content) {
  const lines = content.split('\n');
  const headers = {};
  let bodyStart = 0;
  let inHeaders = true;

  // Parse headers
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (inHeaders && line.trim() === '') {
      bodyStart = i + 1;
      inHeaders = false;
      break;
    }

    if (inHeaders && line.includes(':')) {
      const colonIndex = line.indexOf(':');
      const headerName = line.substring(0, colonIndex).trim().toLowerCase();
      const headerValue = line.substring(colonIndex + 1).trim();
      headers[headerName] = headerValue;
    }
  }

  // Extract body
  const body = lines.slice(bodyStart).join('\n').trim();

  // Parse common fields
  const subject = headers.subject || 'No Subject';
  const from = headers.from || 'Unknown Sender';
  const to = headers.to ? headers.to.split(',').map(addr => addr.trim()) : ['Unknown Recipient'];
  const date = headers.date || 'Unknown Date';

  return {
    subject,
    from,
    to,
    date,
    body,
    headers
  };
}

module.exports = router;
