const { query } = require('../config/db');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const secureStorage = require('../services/secureFileStorageService');
const fileEncryption = require('../services/fileEncryptionService');
const malwareScanner = require('../services/malwareScannerService');
const fileAccessControl = require('../services/fileAccessControlService');
const fileSharing = require('../services/fileSharingService');
const downloadTokenService = require('../services/fileDownloadTokenService');
const dlpService = require('../services/fileDLPService');
const watermarkService = require('../services/fileWatermarkService');

const UPLOAD_TEMP = path.join(secureStorage.TEMP_DIR);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(UPLOAD_TEMP, { recursive: true });
    cb(null, UPLOAD_TEMP);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}-${file.originalname}`);
  },
});

const upload = multer({ storage, limits: { fileSize: secureStorage.MAX_FILE_SIZE } });

// ───────────────────────────────────────────────────────────
// Upload
// ───────────────────────────────────────────────────────────
exports.uploadFile = async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ success: false, message: 'No file provided' });

    const buffer = fs.readFileSync(file.path);
    const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

    const stored = await secureStorage.storeFile(buffer, file.originalname);

    const scanResult = file._scanResult || await malwareScanner.scanFile(null, file.originalname, buffer);

    const result = await query(
      `INSERT INTO file_security_files (original_name, stored_name, mime_type, file_size, file_hash,
       encryption_iv, encryption_tag, storage_path, storage_provider, classification, department,
       uploaded_by, file_category, description, checksum_sha256, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb)
       RETURNING *`,
      [file.originalname, stored.storedName, file._mimeType || file.mimetype, file.size, checksum,
       stored.iv, stored.tag, stored.storagePath, stored.storageProvider,
       req.body.classification || 'internal', req.body.department || null,
       req.user.id, req.body.fileCategory || null, req.body.description || null, checksum,
       req.body.metadata || '{}']
    );
    const dbFile = result.rows[0];

    await malwareScanner.logScanResult(dbFile.id, scanResult);
    await logFileAccess(dbFile.id, req.user.id, 'upload', req);

    if (req.file && fs.existsSync(file.path)) fs.unlinkSync(file.path);

    if (scanResult.detected && scanResult.scanResult !== 'clean') {
      await secureStorage.moveToQuarantine(stored.storedName);
      await query('UPDATE file_security_files SET status = $1 WHERE id = $2', ['quarantined', dbFile.id]);
    }

    res.status(201).json({ success: true, data: dbFile });
  } catch (err) { next(err); }
};

// ───────────────────────────────────────────────────────────
// Download
// ───────────────────────────────────────────────────────────
exports.downloadFile = async (req, res, next) => {
  try {
    const fileId = req.params.id;
    const result = await query('SELECT * FROM file_security_files WHERE id = $1 AND status = $2', [fileId, 'active']);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'File not found' });
    const file = result.rows[0];

    const canAccess = await fileAccessControl.canAccess(req.user, file, 'download');
    if (!canAccess) return res.status(403).json({ success: false, message: 'Access denied' });

    const dlpAlerts = await dlpService.checkAction(req.user.id, 'download', fileId, req.ip);
    if (dlpAlerts.length > 0) {
      logger.warn('DLP triggered on download', { userId: req.user.id, fileId });
    }

    let buffer;
    if (file.is_encrypted && file.encryption_iv && file.encryption_tag) {
      buffer = await secureStorage.retrieveFile(file.stored_name, file.encryption_iv, file.encryption_tag);
    } else {
      buffer = fs.readFileSync(file.storage_path);
    }

    const needsWatermark = (file.classification === 'confidential' || file.classification === 'highly_confidential');
    if (needsWatermark) {
      const watermarkText = await watermarkService.generateWatermarkText(req.user, file);
      await watermarkService.logWatermark(file.id, req.user.id, watermarkText);
    }

    await logFileAccess(file.id, req.user.id, 'download', req);

    res.setHeader('Content-Type', file.mime_type);
    res.setHeader('Content-Disposition', `attachment; filename="${file.original_name}"`);
    res.setHeader('Content-Length', file.file_size);
    res.setHeader('X-File-Id', file.id);
    res.setHeader('X-Classification', file.classification);
    res.send(buffer);
  } catch (err) { next(err); }
};

// ───────────────────────────────────────────────────────────
// Signed Download
// ───────────────────────────────────────────────────────────
exports.signedDownload = async (req, res, next) => {
  try {
    const token = req.params.token;
    const tokenData = await downloadTokenService.validateToken(token);
    if (!tokenData) return res.status(410).json({ success: false, message: 'Token invalid or expired' });

    await downloadTokenService.consumeToken(tokenData.id);

    let buffer;
    if (tokenData.encryption_iv && tokenData.encryption_tag) {
      buffer = await secureStorage.retrieveFile(tokenData.stored_name, tokenData.encryption_iv, tokenData.encryption_tag);
    } else {
      buffer = fs.readFileSync(tokenData.storage_path);
    }

    const needsWatermark = (tokenData.classification === 'confidential' || tokenData.classification === 'highly_confidential');
    if (needsWatermark && tokenData.user_id) {
      const user = (await query('SELECT * FROM users WHERE id = $1', [tokenData.user_id])).rows[0];
      if (user) {
        const watermarkText = await watermarkService.generateWatermarkText(user, tokenData);
        await watermarkService.logWatermark(tokenData.file_id, tokenData.user_id, watermarkText, tokenData.id);
      }
    }

    await logFileAccess(tokenData.file_id, tokenData.user_id, 'signed_download', req);

    res.setHeader('Content-Type', tokenData.mime_type);
    res.setHeader('Content-Disposition', `attachment; filename="${tokenData.original_name}"`);
    res.setHeader('Content-Length', tokenData.file_size);
    res.send(buffer);
  } catch (err) { next(err); }
};

// ───────────────────────────────────────────────────────────
// Preview
// ───────────────────────────────────────────────────────────
exports.previewFile = async (req, res, next) => {
  try {
    const fileId = req.params.id;
    const result = await query('SELECT * FROM file_security_files WHERE id = $1 AND status = $2', [fileId, 'active']);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'File not found' });
    const file = result.rows[0];

    const canAccess = await fileAccessControl.canAccess(req.user, file, 'view');
    if (!canAccess) return res.status(403).json({ success: false, message: 'Access denied' });

    let buffer;
    if (file.is_encrypted && file.encryption_iv && file.encryption_tag) {
      buffer = await secureStorage.retrieveFile(file.stored_name, file.encryption_iv, file.encryption_tag);
    } else {
      buffer = fs.readFileSync(file.storage_path);
    }

    await logFileAccess(file.id, req.user.id, 'preview', req);

    const previewableTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (previewableTypes.includes(file.mime_type)) {
      res.setHeader('Content-Type', file.mime_type);
      res.setHeader('Content-Disposition', `inline; filename="${file.original_name}"`);
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.send(buffer);
    } else {
      res.json({ success: true, data: { message: 'Preview not available for this file type', mimeType: file.mime_type, fileName: file.original_name } });
    }
  } catch (err) { next(err); }
};

// ───────────────────────────────────────────────────────────
// Generate Download Token
// ───────────────────────────────────────────────────────────
exports.generateDownloadToken = async (req, res, next) => {
  try {
    const fileId = req.params.id;
    const result = await query('SELECT * FROM file_security_files WHERE id = $1 AND status = $2', [fileId, 'active']);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'File not found' });
    const file = result.rows[0];

    const canAccess = await fileAccessControl.canAccess(req.user, file, 'download');
    if (!canAccess) return res.status(403).json({ success: false, message: 'Access denied' });

    const token = await downloadTokenService.createToken(fileId, req.user.id, {
      expiresInMs: parseInt(req.body.expiresInMs) || 900000,
      isOneTime: req.body.isOneTime || false,
      maxDownloads: req.body.maxDownloads || 0,
    });

    res.json({ success: true, data: token });
  } catch (err) { next(err); }
};

// ───────────────────────────────────────────────────────────
// Share
// ───────────────────────────────────────────────────────────
exports.shareFile = async (req, res, next) => {
  try {
    const fileId = req.params.id;
    const result = await query('SELECT * FROM file_security_files WHERE id = $1 AND status = $2', [fileId, 'active']);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'File not found' });
    const file = result.rows[0];

    const canAccess = await fileAccessControl.canAccess(req.user, file, 'share');
    if (!canAccess) return res.status(403).json({ success: false, message: 'Access denied' });

    const share = await fileSharing.shareFile(
      fileId, req.user.id,
      req.body.sharedWithUserId || null,
      req.body.sharedWithEmail || null,
      req.body.accessLevel || 'view',
      req.body.expiresInHours || 24
    );

    await dlpService.checkAction(req.user.id, 'share', fileId, req.ip);
    await logFileAccess(fileId, req.user.id, 'share', req);

    res.status(201).json({ success: true, data: share });
  } catch (err) { next(err); }
};

exports.revokeShare = async (req, res, next) => {
  try {
    const result = await fileSharing.revokeShare(req.params.shareId, req.user.id);
    await logFileAccess(result.file_id, req.user.id, 'revoke_share', req);
    res.json({ success: true, message: 'Share revoked' });
  } catch (err) { next(err); }
};

exports.accessShared = async (req, res, next) => {
  try {
    const share = await fileSharing.accessSharedDocument(req.params.token, req.user.id);

    let buffer;
    if (share.encryption_iv && share.encryption_tag) {
      buffer = await secureStorage.retrieveFile(share.stored_name, share.encryption_iv, share.encryption_tag);
    } else {
      buffer = fs.readFileSync(share.storage_path);
    }

    await logFileAccess(share.file_id, req.user.id, 'shared_access', req);

    res.setHeader('Content-Type', share.mime_type);
    res.setHeader('Content-Disposition', `inline; filename="${share.original_name}"`);
    res.send(buffer);
  } catch (err) { next(err); }
};

// ───────────────────────────────────────────────────────────
// File Management
// ───────────────────────────────────────────────────────────
exports.listFiles = async (req, res, next) => {
  try {
    let sql = `SELECT f.*, COALESCE(ep.full_name, u.email) AS uploaded_by_name FROM file_security_files f LEFT JOIN users u ON f.uploaded_by = u.id LEFT JOIN employee_profiles ep ON u.id = ep.user_id WHERE f.deleted_at IS NULL`;
    const params = [];
    let idx = 1;

    if (req.query.status && req.query.status !== 'all') { sql += ` AND f.status = $${idx++}`; params.push(req.query.status); }
    if (req.query.classification) { sql += ` AND f.classification = $${idx++}`; params.push(req.query.classification); }
    if (req.query.department) { sql += ` AND f.department = $${idx++}`; params.push(req.query.department); }
    if (req.query.category) { sql += ` AND f.file_category = $${idx++}`; params.push(req.query.category); }
    if (req.query.search) { sql += ` AND (f.original_name ILIKE $${idx} OR f.description ILIKE $${idx})`; params.push(`%${req.query.search}%`); idx++; }
    if (req.query.userId) { sql += ` AND f.uploaded_by = $${idx++}`; params.push(req.query.userId); }

    if (!['System Admin'].includes(req.user.role_name)) {
      sql += ` AND (f.uploaded_by = $${idx} OR f.department = $${idx + 1})`;
      params.push(req.user.id, req.user.department_name);
      idx += 2;
    }

    sql += ' ORDER BY f.created_at DESC LIMIT $' + (idx++) + ' OFFSET $' + (idx++);
    params.push(parseInt(req.query.limit) || 50, parseInt(req.query.offset) || 0);

    const countSql = 'SELECT COUNT(*)::int AS total FROM (' + sql.replace(/SELECT.*FROM/, 'SELECT 1 FROM').replace(/ORDER BY.*/, '') + ') sub';
    const [filesResult, countResult] = await Promise.all([
      query(sql, params),
      query(countSql, params.slice(0, -2)),
    ]);

    res.json({ success: true, data: { files: filesResult.rows, total: countResult.rows[0].total } });
  } catch (err) { next(err); }
};

exports.getFile = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT f.*, COALESCE(ep.full_name, u.email) AS uploaded_by_name, u.email AS uploaded_by_email
       FROM file_security_files f LEFT JOIN users u ON f.uploaded_by = u.id
       LEFT JOIN employee_profiles ep ON u.id = ep.user_id
       WHERE f.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'File not found' });
    const file = result.rows[0];

    const canAccess = await fileAccessControl.canAccess(req.user, file, 'view');
    if (!canAccess) return res.status(403).json({ success: false, message: 'Access denied' });

    await logFileAccess(file.id, req.user.id, 'view', req);
    res.json({ success: true, data: file });
  } catch (err) { next(err); }
};

exports.updateFile = async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE file_security_files SET classification = COALESCE($1, classification),
       department = COALESCE($2, department), description = COALESCE($3, description),
       metadata = CASE WHEN $4::jsonb IS NOT NULL THEN $4::jsonb ELSE metadata END,
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND uploaded_by = $6 RETURNING *`,
      [req.body.classification, req.body.department, req.body.description,
       req.body.metadata || null, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'File not found or unauthorized' });
    await logFileAccess(result.rows[0].id, req.user.id, 'update', req);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

exports.deleteFile = async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE file_security_files SET deleted_at = CURRENT_TIMESTAMP, status = 'deleted'
       WHERE id = $1 AND (uploaded_by = $2 OR $3 = ANY(SELECT role_name FROM users WHERE id = $2))
       RETURNING *`,
      [req.params.id, req.user.id, 'System Admin']
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'File not found or unauthorized' });
    await logFileAccess(result.rows[0].id, req.user.id, 'delete', req);
    res.json({ success: true, message: 'File deleted' });
  } catch (err) { next(err); }
};

// ───────────────────────────────────────────────────────────
// Access Logs
// ───────────────────────────────────────────────────────────
exports.getFileAccessLogs = async (req, res, next) => {
  try {
    let sql = `SELECT l.*, COALESCE(ep.full_name, u.email) AS user_name, f.original_name AS file_name
               FROM file_access_logs l
               LEFT JOIN users u ON l.user_id = u.id
               LEFT JOIN employee_profiles ep ON u.id = ep.user_id
               LEFT JOIN file_security_files f ON l.file_id = f.id
               WHERE 1=1`;
    const params = [];
    let idx = 1;
    if (req.query.fileId) { sql += ` AND l.file_id = $${idx++}`; params.push(req.query.fileId); }
    if (req.query.userId) { sql += ` AND l.user_id = $${idx++}`; params.push(req.query.userId); }
    if (req.query.action) { sql += ` AND l.action = $${idx++}`; params.push(req.query.action); }
    if (req.query.suspicious === 'true') { sql += ' AND l.is_suspicious = true'; }
    sql += ' ORDER BY l.created_at DESC LIMIT $' + (idx++) + ' OFFSET $' + (idx++);
    params.push(parseInt(req.query.limit) || 100, parseInt(req.query.offset) || 0);
    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
};

// ───────────────────────────────────────────────────────────
// DLP
// ───────────────────────────────────────────────────────────
exports.getDLPAlerts = async (req, res, next) => {
  try {
    const alerts = await dlpService.getAlerts(req.query);
    res.json({ success: true, data: alerts });
  } catch (err) { next(err); }
};

exports.resolveDLPAlert = async (req, res, next) => {
  try {
    await dlpService.resolveAlert(req.params.id, req.user.id);
    res.json({ success: true, message: 'Alert resolved' });
  } catch (err) { next(err); }
};

exports.getDLPStats = async (req, res, next) => {
  try {
    const stats = await dlpService.getStats();
    res.json({ success: true, data: stats });
  } catch (err) { next(err); }
};

// ───────────────────────────────────────────────────────────
// Sharing
// ───────────────────────────────────────────────────────────
exports.getMyShares = async (req, res, next) => {
  try {
    const shares = await fileSharing.getSharesByUser(req.user.id);
    res.json({ success: true, data: shares });
  } catch (err) { next(err); }
};

exports.getShareAnalytics = async (req, res, next) => {
  try {
    const analytics = await fileSharing.getShareAnalytics(req.user.id);
    res.json({ success: true, data: analytics });
  } catch (err) { next(err); }
};

// ───────────────────────────────────────────────────────────
// Classification
// ───────────────────────────────────────────────────────────
exports.getClassifications = async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM file_classifications ORDER BY max_access_level');
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
};

exports.updateClassification = async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE file_classifications SET label = COALESCE($1, label), color = COALESCE($2, color),
       description = COALESCE($3, description), requires_watermark = COALESCE($4, requires_watermark),
       allowed_roles = COALESCE($5::text[], allowed_roles),
       allowed_departments = COALESCE($6::text[], allowed_departments),
       is_active = COALESCE($7, is_active)
       WHERE id = $8 RETURNING *`,
      [req.body.label, req.body.color, req.body.description,
       req.body.requiresWatermark, req.body.allowedRoles || null,
       req.body.allowedDepartments || null, req.body.isActive, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Classification not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

// ───────────────────────────────────────────────────────────
// Scan/Malware
// ───────────────────────────────────────────────────────────
exports.getScanHistory = async (req, res, next) => {
  try {
    const logs = await malwareScanner.getScanHistory(req.params.fileId);
    res.json({ success: true, data: logs });
  } catch (err) { next(err); }
};

async function getScanStatsData() {
  const [total, infected, suspicious, clean] = await Promise.all([
    query("SELECT COUNT(*)::int AS count FROM file_malware_scans"),
    query("SELECT COUNT(*)::int AS count FROM file_malware_scans WHERE scan_result = 'infected'"),
    query("SELECT COUNT(*)::int AS count FROM file_malware_scans WHERE scan_result = 'suspicious'"),
    query("SELECT COUNT(*)::int AS count FROM file_malware_scans WHERE scan_result = 'clean'"),
  ]);
  return { totalScans: total.rows[0].count, infected: infected.rows[0].count, suspicious: suspicious.rows[0].count, clean: clean.rows[0].count };
}

exports.getScanStats = async (req, res, next) => {
  try { res.json({ success: true, data: await getScanStatsData() }); } catch (err) { next(err); }
};

async function getStorageAnalyticsData() {
  const [storage, filesByType, filesByClass, usage, analytics] = await Promise.all([
    query(`SELECT COUNT(*)::int AS total_files, COALESCE(SUM(file_size), 0)::bigint AS total_bytes FROM file_security_files WHERE deleted_at IS NULL`),
    query('SELECT mime_type, COUNT(*)::int AS count, COALESCE(SUM(file_size), 0)::bigint AS total_bytes FROM file_security_files WHERE deleted_at IS NULL GROUP BY mime_type'),
    query('SELECT classification, COUNT(*)::int AS count FROM file_security_files WHERE deleted_at IS NULL GROUP BY classification'),
    Promise.resolve(secureStorage.getStorageUsage()),
    query('SELECT * FROM file_storage_analytics ORDER BY snapshot_date DESC LIMIT 30'),
  ]);
  return { totalFiles: storage.rows[0].total_files, totalBytes: storage.rows[0].total_bytes, filesByType: filesByType.rows, filesByClassification: filesByClass.rows, diskUsage: usage, history: analytics.rows };
}

exports.getStorageAnalytics = async (req, res, next) => {
  try { res.json({ success: true, data: await getStorageAnalyticsData() }); } catch (err) { next(err); }
};

// ───────────────────────────────────────────────────────────
// Watermarks
// ───────────────────────────────────────────────────────────
exports.getWatermarkLogs = async (req, res, next) => {
  try {
    const logs = await watermarkService.getWatermarkLogs(req.params.fileId);
    res.json({ success: true, data: logs });
  } catch (err) { next(err); }
};

// ───────────────────────────────────────────────────────────
// Dashboard
// ───────────────────────────────────────────────────────────
exports.getDashboard = async (req, res, next) => {
  try {
    const [fileStats, recentUploads, recentAccess, dlpStats, scanStats, storageStats] = await Promise.all([
      query(`SELECT COUNT(*)::int AS total, COALESCE(SUM(file_size),0)::bigint AS total_bytes FROM file_security_files WHERE deleted_at IS NULL`),
      query(`SELECT f.*, COALESCE(ep.full_name, u.email) AS uploaded_by_name FROM file_security_files f LEFT JOIN users u ON f.uploaded_by = u.id LEFT JOIN employee_profiles ep ON u.id = ep.user_id WHERE f.deleted_at IS NULL ORDER BY f.created_at DESC LIMIT 10`),
      query(`SELECT l.*, f.original_name AS file_name, COALESCE(ep.full_name, u.email) AS user_name FROM file_access_logs l LEFT JOIN file_security_files f ON l.file_id = f.id LEFT JOIN users u ON l.user_id = u.id LEFT JOIN employee_profiles ep ON u.id = ep.user_id ORDER BY l.created_at DESC LIMIT 20`),
      dlpService.getStats(),
      getScanStatsData(),
      getStorageAnalyticsData(),
    ]);
    res.json({ success: true, data: {
      fileStats: fileStats.rows[0],
      recentUploads: recentUploads.rows,
      recentAccess: recentAccess.rows,
      dlp: dlpStats,
      scanStats: scanStats.data,
      storage: storageStats.data,
    }});
  } catch (err) { next(err); }
};

// ───────────────────────────────────────────────────────────
// Helper
// ───────────────────────────────────────────────────────────
async function logFileAccess(fileId, userId, action, req) {
  try {
    await query(
      `INSERT INTO file_access_logs (file_id, user_id, action, ip_address, user_agent, details)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb)`,
      [fileId, userId, action, req.ip || req.connection?.remoteAddress,
       req.headers['user-agent'], JSON.stringify({ method: req.method, path: req.originalUrl })]
    );
  } catch (e) { logger.error('Access log insert failed', { error: e.message }); }
}

exports.getUploadMiddleware = () => upload.single('file');
