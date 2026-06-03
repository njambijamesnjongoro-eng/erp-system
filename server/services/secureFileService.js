const crypto = require('crypto');
const { query } = require('../config/db');
const logger = require('../utils/logger');

const SIGNED_URL_EXPIRY = 15 * 60 * 1000;
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'text/csv',
];

function generateSignedUrl(fileId, userId, expiresAt) {
  const data = `${fileId}:${userId}:${expiresAt}:${process.env.JWT_SECRET}`;
  const signature = crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  return `/api/files/secure/${fileId}?expires=${expiresAt}&sig=${signature}&uid=${userId}`;
}

function verifySignedUrl(fileId, userId, expiresAt, signature) {
  if (Date.now() > parseInt(expiresAt)) return false;
  const data = `${fileId}:${userId}:${expiresAt}:${process.env.JWT_SECRET}`;
  const expected = crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  return signature === expected;
}

async function logFileAccess(fileId, userId, action, ipAddress) {
  try {
    await query(
      `INSERT INTO db_activities (user_id, table_name, operation, record_id, ip_address)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, 'file_storage', action, fileId, ipAddress]
    );
  } catch (e) { logger.error('File access log failed', { error: e.message }); }
}

function validateFileType(mimetype) {
  return ALLOWED_MIME_TYPES.includes(mimetype);
}

function validateFileSize(size) {
  return size <= MAX_FILE_SIZE;
}

module.exports = {
  generateSignedUrl, verifySignedUrl, logFileAccess,
  validateFileType, validateFileSize, ALLOWED_MIME_TYPES, MAX_FILE_SIZE,
};
