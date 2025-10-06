const express = require('express');
const { S3Client, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { simpleParser } = require('mailparser');
const router = express.Router();

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-west-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'jouster-dev-bucket';
const EMAIL_PREFIX = process.env.S3_EMAIL_PREFIX || 'email/';

/**
 * GET /api/emails
 * List email files with pagination
 */
router.get('/emails', async (req, res) => {
  try {
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize) || 100, 10), 500);
    const marker = req.query.marker || undefined;

    const listParams = {
      Bucket: BUCKET_NAME,
      Prefix: EMAIL_PREFIX,
      MaxKeys: pageSize,
      ContinuationToken: marker,
    };

    const command = new ListObjectsV2Command(listParams);
    const response = await s3Client.send(command);

    const files = (response.Contents || []).map(object => ({
      key: object.Key,
      lastModified: object.LastModified.toISOString(),
      size: object.Size || 0,
      displayName: object.Key.replace(EMAIL_PREFIX, ''), // Remove prefix for display
    }));

    const result = {
      files,
      totalCount: response.KeyCount || 0,
      hasMore: response.IsTruncated || false,
      nextMarker: response.NextContinuationToken || undefined,
    };

    res.json(result);
  } catch (error) {
    console.error('Error listing emails:', error);
    res.status(500).json({
      error: 'Failed to list email files',
      message: error.message,
    });
  }
});

/**
 * GET /api/emails/:key/download
 * Generate a signed URL for downloading an email file
 */
router.get('/emails/:key/download', async (req, res) => {
  try {
    const key = decodeURIComponent(req.params.key);
    const fullKey = key.startsWith(EMAIL_PREFIX) ? key : EMAIL_PREFIX + key;

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fullKey,
    });

    // Generate signed URL valid for 1 hour
    const downloadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    res.json({ downloadUrl });
  } catch (error) {
    console.error('Error generating download URL:', error);
    res.status(500).json({
      error: 'Failed to generate download URL',
      message: error.message,
    });
  }
});

/**
 * GET /api/emails/:key/content
 * Get the content of an email file (for preview)
 */
router.get('/emails/:key/content', async (req, res) => {
  try {
    const key = decodeURIComponent(req.params.key);
    const fullKey = key.startsWith(EMAIL_PREFIX) ? key : EMAIL_PREFIX + key;

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fullKey,
    });

    const response = await s3Client.send(command);
    const content = await streamToString(response.Body);

    res.set('Content-Type', 'text/plain');
    res.send(content);
  } catch (error) {
    console.error('Error getting email content:', error);
    res.status(500).json({
      error: 'Failed to get email content',
      message: error.message,
    });
  }
});

/**
 * GET /api/emails/:key/parse
 * Parse an email file and return structured data
 */
router.get('/emails/:key/parse', async (req, res) => {
  try {
    const key = decodeURIComponent(req.params.key);
    const fullKey = key.startsWith(EMAIL_PREFIX) ? key : EMAIL_PREFIX + key;

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fullKey,
    });

    const response = await s3Client.send(command);
    const emailContent = await streamToString(response.Body);

    // Parse the email using mailparser
    const parsed = await simpleParser(emailContent);

    // Extract and format the parsed data
    const parsedEmail = {
      subject: parsed.subject || 'No Subject',
      from: formatEmailAddress(parsed.from),
      to: formatEmailAddresses(parsed.to),
      date: parsed.date ? parsed.date.toISOString() : new Date().toISOString(),
      body: formatEmailBody(parsed),
      headers: formatHeaders(parsed.headers)
    };

    res.json(parsedEmail);
  } catch (error) {
    console.error('Error parsing email:', error);
    res.status(500).json({
      error: 'Failed to parse email',
      message: error.message,
    });
  }
});

/**
 * Helper function to convert stream to string
 */
function streamToString(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
}

/**
 * Helper function to format email addresses
 */
function formatEmailAddress(addressObj) {
  if (!addressObj) return 'Unknown';
  if (typeof addressObj === 'string') return addressObj;
  if (addressObj.text) return addressObj.text;
  if (addressObj.name && addressObj.address) {
    return `${addressObj.name} <${addressObj.address}>`;
  }
  if (addressObj.address) return addressObj.address;
  return 'Unknown';
}

function formatEmailAddresses(addressArray) {
  if (!addressArray) return [];
  if (typeof addressArray === 'string') return [addressArray];
  if (Array.isArray(addressArray)) {
    return addressArray.map(addr => formatEmailAddress(addr));
  }
  return [formatEmailAddress(addressArray)];
}

/**
 * Helper function to format email body
 */
function formatEmailBody(parsed) {
  // Prefer HTML content, fall back to text
  if (parsed.html) {
    // Sanitize HTML content for display
    return sanitizeHtml(parsed.html);
  } else if (parsed.text) {
    // Convert plain text to HTML with line breaks
    return `<pre>${escapeHtml(parsed.text)}</pre>`;
  } else if (parsed.textAsHtml) {
    return sanitizeHtml(parsed.textAsHtml);
  }
  return '<p><em>No readable content found</em></p>';
}

/**
 * Helper function to format headers
 */
function formatHeaders(headers) {
  const formattedHeaders = {};

  if (headers) {
    // Convert Map to regular object and format common headers
    for (const [key, value] of headers) {
      if (typeof value === 'string' || typeof value === 'number') {
        formattedHeaders[key] = value.toString();
      } else if (Array.isArray(value)) {
        formattedHeaders[key] = value.join(', ');
      } else if (value && typeof value === 'object') {
        formattedHeaders[key] = JSON.stringify(value);
      }
    }
  }

  return formattedHeaders;
}

/**
 * Helper function to sanitize HTML content
 */
function sanitizeHtml(html) {
  if (!html) return '';

  // Basic HTML sanitization - in production, use a library like DOMPurify
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '');
}

/**
 * Helper function to escape HTML
 */
function escapeHtml(text) {
  if (!text) return '';

  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = router;
