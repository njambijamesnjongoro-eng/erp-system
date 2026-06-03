const fs = require('fs');
const logger = require('../utils/logger');
const secureStorage = require('../services/secureFileStorageService');
const malwareScanner = require('../services/malwareScannerService');

const MIME_MAP = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

function createFileUploadMiddleware() {
  return async (req, res, next) => {
    if (!req.file && !req.files) return next();

    const files = req.files || (req.file ? [req.file] : []);

    for (const file of files) {
      const ext = file.originalname ? '.' + file.originalname.split('.').pop().toLowerCase() : '';
      const mimeType = MIME_MAP[ext] || file.mimetype;

      if (!secureStorage.ALLOWED_EXTENSIONS.includes(ext)) {
        cleanUpFile(file);
        return res.status(400).json({ success: false, message: `File type '${ext}' is not allowed` });
      }

      if (!secureStorage.ALLOWED_MIME_TYPES.includes(mimeType)) {
        cleanUpFile(file);
        return res.status(400).json({ success: false, message: `MIME type '${mimeType}' is not allowed` });
      }

      if (file.size > secureStorage.MAX_FILE_SIZE) {
        cleanUpFile(file);
        return res.status(413).json({ success: false, message: `File exceeds maximum size of ${secureStorage.MAX_FILE_SIZE / 1024 / 1024}MB` });
      }

      const buffer = fs.readFileSync(file.path);
      const scanResult = await malwareScanner.scanFile(null, file.originalname, buffer);

      await malwareScanner.logScanResult(null, scanResult);

      if (scanResult.scanResult === 'infected') {
        cleanUpFile(file);
        return res.status(422).json({ success: false, message: 'File rejected: malware or malicious content detected', threats: scanResult.threats.map(t => t.name) });
      }

      if (scanResult.scanResult === 'suspicious') {
        logger.warn('Suspicious file uploaded', { file: file.originalname, threats: scanResult.threats });
        file._scanResult = scanResult;
      } else {
        file._scanResult = scanResult;
      }

      file._mimeType = mimeType;
      file._ext = ext;
    }

    next();
  };
}

function cleanUpFile(file) {
  if (file.path && fs.existsSync(file.path)) {
    fs.unlinkSync(file.path);
  }
}

module.exports = { createFileUploadMiddleware, cleanUpFile };
