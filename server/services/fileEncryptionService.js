const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function getEncryptionKey() {
  const key = process.env.FILE_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;
  if (!key) throw new Error('FILE_ENCRYPTION_KEY or ENCRYPTION_KEY environment variable required');
  return crypto.scryptSync(key, 'file-encryption-salt-v1', KEY_LENGTH);
}

async function encryptFile(inputPath, outputPath) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const input = fs.createReadStream(inputPath);
  const output = fs.createWriteStream(outputPath);
  return new Promise((resolve, reject) => {
    const tagLength = TAG_LENGTH;
    let ciphertextLength = 0;
    cipher.on('data', (chunk) => { ciphertextLength += chunk.length; });
    input.pipe(cipher).pipe(output);
    output.on('finish', () => {
      const tag = cipher.getAuthTag();
      const ivHex = iv.toString('hex');
      const tagHex = tag.toString('hex');
      const fileSize = fs.statSync(outputPath).size;
      resolve({ iv: ivHex, tag: tagHex, encryptedSize: fileSize });
    });
    output.on('error', reject);
    input.on('error', reject);
    cipher.on('error', reject);
  });
}

async function decryptFile(inputPath, outputPath, ivHex, tagHex) {
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const input = fs.createReadStream(inputPath);
  const output = fs.createWriteStream(outputPath);
  return new Promise((resolve, reject) => {
    input.pipe(decipher).pipe(output);
    output.on('finish', () => resolve({ decryptedPath: outputPath }));
    output.on('error', reject);
    input.on('error', reject);
    decipher.on('error', reject);
  });
}

async function encryptBuffer(buffer) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { encrypted, iv: iv.toString('hex'), tag: tag.toString('hex') };
}

async function decryptBuffer(encryptedBuffer, ivHex, tagHex) {
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
}

function generateFileChecksum(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

function generateBufferChecksum(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

module.exports = { encryptFile, decryptFile, encryptBuffer, decryptBuffer, generateFileChecksum, generateBufferChecksum };
