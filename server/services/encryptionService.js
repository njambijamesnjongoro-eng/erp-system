const crypto = require('crypto');
const logger = require('../utils/logger');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function getEncryptionKey() {
  const key = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!key) throw new Error('ENCRYPTION_KEY not configured');
  return crypto.scryptSync(key, 'erp-salt-v1', KEY_LENGTH);
}

function encrypt(text) {
  if (text === null || text === undefined) return null;
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(String(text), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function decrypt(encryptedText) {
  if (!encryptedText) return null;
  try {
    const key = getEncryptionKey();
    const parts = encryptedText.split(':');
    if (parts.length !== 3) return encryptedText;
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    logger.error('Decryption failed', { error: e.message });
    return null;
  }
}

function encryptObject(obj, fields) {
  if (!obj || !fields || !fields.length) return obj;
  const result = { ...obj };
  for (const field of fields) {
    if (result[field] !== undefined && result[field] !== null) {
      result[field] = encrypt(result[field]);
    }
  }
  return result;
}

function decryptObject(obj, fields) {
  if (!obj || !fields || !fields.length) return obj;
  const result = { ...obj };
  for (const field of fields) {
    if (result[field] !== undefined && result[field] !== null) {
      result[field] = decrypt(result[field]);
    }
  }
  return result;
}

async function rotateEncryptionKey(newKeyEnvVar) {
  const oldKey = getEncryptionKey();
  process.env.ENCRYPTION_KEY = process.env[newKeyEnvVar] || process.env.ENCRYPTION_KEY;
  const newKey = getEncryptionKey();
  return { rotated: oldKey.toString('hex') !== newKey.toString('hex') };
}

module.exports = { encrypt, decrypt, encryptObject, decryptObject, rotateEncryptionKey };
