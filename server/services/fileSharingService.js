const { query } = require('../config/db');
const logger = require('../utils/logger');
const crypto = require('crypto');

class FileSharingService {
  async shareFile(fileId, sharedBy, sharedWithUserId, sharedWithEmail, accessLevel = 'view', expiresInHours = 24) {
    const shareToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + expiresInHours * 3600000).toISOString();
    const result = await query(
      `INSERT INTO file_shared_documents (file_id, shared_by, shared_with_user, shared_with_email,
       access_level, share_token, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [fileId, sharedBy, sharedWithUserId, sharedWithEmail, accessLevel, shareToken, expiresAt]
    );
    logger.info('File shared', { fileId, sharedBy, sharedWith: sharedWithUserId || sharedWithEmail });
    return { ...result.rows[0], shareLink: `/api/file-security/shared/access/${shareToken}` };
  }

  async revokeShare(shareId, userId) {
    const result = await query(
      `UPDATE file_shared_documents SET is_revoked = true, revoked_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND shared_by = $2 RETURNING *`,
      [shareId, userId]
    );
    if (result.rows.length === 0) throw new Error('Share not found or unauthorized');
    logger.info('Share revoked', { shareId, userId });
    return result.rows[0];
  }

  async accessSharedDocument(shareToken, userId) {
    const result = await query(
      `SELECT s.*, f.stored_name, f.original_name, f.mime_type, f.file_size, f.encryption_iv, f.encryption_tag,
       f.classification, f.storage_path
       FROM file_shared_documents s JOIN file_security_files f ON s.file_id = f.id
       WHERE s.share_token = $1 AND s.is_revoked = false
       AND (s.expires_at IS NULL OR s.expires_at > CURRENT_TIMESTAMP)`,
      [shareToken]
    );
    if (result.rows.length === 0) throw new Error('Share not found, revoked, or expired');
    const share = result.rows[0];
    if (share.shared_with_user && share.shared_with_user !== userId) throw new Error('This share is not intended for you');
    await query('UPDATE file_shared_documents SET access_count = access_count + 1, last_accessed_at = CURRENT_TIMESTAMP WHERE id = $1', [share.id]);
    return share;
  }

  async getSharesByUser(userId) {
    const result = await query(
      `SELECT s.*, f.original_name AS file_name, f.mime_type, f.file_size, f.classification,
       sh.full_name AS shared_by_name
       FROM file_shared_documents s
       JOIN file_security_files f ON s.file_id = f.id
       JOIN users sh ON s.shared_by = sh.id
       WHERE s.shared_with_user = $1 OR s.shared_by = $1
       ORDER BY s.created_at DESC LIMIT 50`,
      [userId]
    );
    return result.rows;
  }

  async getShareAnalytics(userId) {
    const stats = await query(
      `SELECT COUNT(*)::int AS total_shares,
       COUNT(*) FILTER (WHERE is_revoked = true)::int AS revoked,
       COUNT(*) FILTER (WHERE expires_at < CURRENT_TIMESTAMP)::int AS expired,
       COALESCE(SUM(access_count), 0)::int AS total_accesses
       FROM file_shared_documents WHERE shared_by = $1`,
      [userId]
    );
    const recentShares = await query(
      `SELECT s.*, f.original_name FROM file_shared_documents s
       JOIN file_security_files f ON s.file_id = f.id
       WHERE s.shared_by = $1 ORDER BY s.created_at DESC LIMIT 10`,
      [userId]
    );
    return { stats: stats.rows[0], recentShares: recentShares.rows };
  }
}

module.exports = new FileSharingService();
