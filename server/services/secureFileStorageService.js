const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const logger = require('../utils/logger');
const fileEncryption = require('./fileEncryptionService');

const UPLOAD_DIR = process.env.FILE_STORAGE_PATH || path.join(__dirname, '..', 'secure_uploads');
const ENCRYPTED_DIR = path.join(UPLOAD_DIR, 'encrypted');
const QUARANTINE_DIR = path.join(UPLOAD_DIR, 'quarantine');
const TEMP_DIR = path.join(UPLOAD_DIR, 'temp');
const MAX_FILE_SIZE = parseInt(process.env.FILE_MAX_SIZE) || 50 * 1024 * 1024;

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg', 'image/png',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.docx', '.xlsx', '.pptx'];

async function ensureDirectories() {
  for (const dir of [UPLOAD_DIR, ENCRYPTED_DIR, QUARANTINE_DIR, TEMP_DIR]) {
    await fsp.mkdir(dir, { recursive: true });
  }
}

function generateStoredName(originalName) {
  const ext = path.extname(originalName).toLowerCase();
  const hash = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now();
  return `${timestamp}-${hash}${ext}`;
}

async function storeFile(buffer, originalName) {
  await ensureDirectories();
  const storedName = generateStoredName(originalName);
  const tempPath = path.join(TEMP_DIR, storedName);
  const encryptedPath = path.join(ENCRYPTED_DIR, storedName);

  await fsp.writeFile(tempPath, buffer);

  const checksum = await fileEncryption.generateFileChecksum(tempPath);

  const { iv, tag } = await fileEncryption.encryptFile(tempPath, encryptedPath);

  await fsp.unlink(tempPath);

  const stats = await fsp.stat(encryptedPath);

  logger.info('File stored securely', { storedName, size: stats.size });
  return {
    storedName,
    storagePath: encryptedPath,
    iv,
    tag,
    checksum,
    encryptedSize: stats.size,
    storageProvider: 'local',
    bucketName: 'secure_uploads',
  };
}

async function retrieveFile(storedName, iv, tag) {
  const encryptedPath = path.join(ENCRYPTED_DIR, storedName);
  const decryptedPath = path.join(TEMP_DIR, `dec-${storedName}`);

  if (!fs.existsSync(encryptedPath)) {
    throw new Error('File not found in secure storage');
  }

  await fileEncryption.decryptFile(encryptedPath, decryptedPath, iv, tag);
  const buffer = await fsp.readFile(decryptedPath);
  await fsp.unlink(decryptedPath).catch(() => {});
  return buffer;
}

async function moveToQuarantine(storedName) {
  const src = path.join(ENCRYPTED_DIR, storedName);
  const dest = path.join(QUARANTINE_DIR, storedName);
  if (fs.existsSync(src)) {
    await fsp.rename(src, dest);
    logger.warn('File moved to quarantine', { storedName });
  }
}

async function deleteFile(storedName) {
  const encryptedPath = path.join(ENCRYPTED_DIR, storedName);
  if (fs.existsSync(encryptedPath)) {
    await fsp.unlink(encryptedPath);
    logger.info('File deleted from secure storage', { storedName });
  }
}

function getStorageUsage() {
  let totalSize = 0;
  let fileCount = 0;
  if (fs.existsSync(ENCRYPTED_DIR)) {
    const files = fs.readdirSync(ENCRYPTED_DIR);
    for (const file of files) {
      const stat = fs.statSync(path.join(ENCRYPTED_DIR, file));
      totalSize += stat.size;
      fileCount++;
    }
  }
  return { totalSize, fileCount, encryptedDir: ENCRYPTED_DIR, quarantineDir: QUARANTINE_DIR };
}

module.exports = {
  storeFile, retrieveFile, moveToQuarantine, deleteFile, getStorageUsage,
  UPLOAD_DIR, ENCRYPTED_DIR, QUARANTINE_DIR, TEMP_DIR,
  MAX_FILE_SIZE, ALLOWED_MIME_TYPES, ALLOWED_EXTENSIONS, ensureDirectories,
};
