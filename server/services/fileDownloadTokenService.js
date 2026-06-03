const { query } = require('../config/db');
const crypto = require('crypto');

class DownloadTokenService {
  async createToken(fileId, userId, options = {}) {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + (options.expiresInMs || 900000)).toISOString();
    const result = await query(
      `INSERT INTO file_download_tokens (file_id, user_id, token_hash, token_type, is_one_time, max_downloads, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, token_type, is_one_time, expires_at`,
      [fileId, userId, tokenHash, options.tokenType || 'download', options.isOneTime || false, options.maxDownloads || 0, expiresAt]
    );
    return { ...result.rows[0], token, expiresAt, downloadUrl: `/api/file-security/download/${token}` };
  }

  async validateToken(token, expectedAction = 'download') {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const result = await query(
      `SELECT t.*, f.stored_name, f.original_name, f.mime_type, f.file_size,
       f.encryption_iv, f.encryption_tag, f.classification, f.storage_path
       FROM file_download_tokens t
       JOIN file_security_files f ON t.file_id = f.id
       WHERE t.token_hash = $1 AND t.is_revoked = false
       AND t.expires_at > CURRENT_TIMESTAMP
       AND (t.max_downloads = 0 OR t.download_count < t.max_downloads)`,
      [tokenHash]
    );
    if (result.rows.length === 0) return null;
    return result.rows[0];
  }

  async consumeToken(tokenId) {
    await query(
      `UPDATE file_download_tokens SET download_count = download_count + 1,
       is_revoked = CASE WHEN max_downloads > 0 AND download_count + 1 >= max_downloads THEN true ELSE is_revoked END
       WHERE id = $1`,
      [tokenId]
    );
  }

  async revokeToken(tokenId) {
    await query(
      'UPDATE file_download_tokens SET is_revoked = true, revoked_at = CURRENT_TIMESTAMP WHERE id = $1',
      [tokenId]
    );
    return true;
  }

  async cleanupExpired() {
    const result = await query(
      "UPDATE file_download_tokens SET is_revoked = true WHERE expires_at < CURRENT_TIMESTAMP AND is_revoked = false"
    );
    return result.rowCount;
  }

  async getTokensForFile(fileId) {
    const result = await query(
      'SELECT * FROM file_download_tokens WHERE file_id = $1 ORDER BY created_at DESC',
      [fileId]
    );
    return result.rows;
  }
}

module.exports = new DownloadTokenService();
