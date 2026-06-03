const { query } = require('../config/db');
const logger = require('../utils/logger');

class WatermarkService {
  async generateWatermarkText(user, file) {
    const parts = [
      'CONFIDENTIAL',
      `Downloaded by: ${user.full_name || user.email || 'Unknown'}`,
      `Date & Time: ${new Date().toISOString().replace('T', ' ').substring(0, 19)}`,
      `Department: ${user.department_name || 'N/A'}`,
      `File: ${file.original_name || 'N/A'}`,
    ];
    return parts.join(' | ');
  }

  async logWatermark(fileId, userId, watermarkText, downloadTokenId = null) {
    try {
      await query(
        `INSERT INTO file_watermark_logs (file_id, user_id, watermark_text, watermark_type, position, opacity, download_token_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [fileId, userId, watermarkText, 'confidential', 'center', 0.30, downloadTokenId]
      );
    } catch (err) { logger.error('Failed to log watermark', { error: err.message }); }
  }

  async getWatermarkLogs(fileId) {
    const result = await query(
      `SELECT w.*, u.full_name AS user_name FROM file_watermark_logs w
       LEFT JOIN users u ON w.user_id = u.id
       WHERE w.file_id = $1 ORDER BY w.created_at DESC`,
      [fileId]
    );
    return result.rows;
  }
}

module.exports = new WatermarkService();
