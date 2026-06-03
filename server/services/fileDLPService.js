const { query } = require('../config/db');
const logger = require('../utils/logger');

class DLPService {
  constructor() {
    this.suspiciousPatterns = {
      bulkDownload: { threshold: 20, windowMs: 3600000 },
      massExport: { threshold: 50, windowMs: 600000 },
      rapidShare: { threshold: 10, windowMs: 300000 },
      anomymousAccess: { threshold: 5, windowMs: 3600000 },
    };
    this.userActionCache = new Map();
  }

  async checkAction(userId, action, fileId, ipAddress) {
    const alerts = [];
    const cacheKey = `${userId}:${action}`;
    const now = Date.now();
    if (!this.userActionCache.has(cacheKey)) this.userActionCache.set(cacheKey, []);

    const timestamps = this.userActionCache.get(cacheKey);
    timestamps.push(now);

    const dlpType = this._getDLPType(action);
    switch (dlpType) {
      case 'bulk_download':
        alerts.push(...await this._checkBulkDownload(userId, timestamps, action, fileId, ipAddress));
        break;
      case 'mass_export':
        alerts.push(...await this._checkMassExport(userId, timestamps, action, fileId, ipAddress));
        break;
      case 'rapid_share':
        alerts.push(...await this._checkRapidShare(userId, timestamps, action, fileId, ipAddress));
        break;
      default:
        break;
    }

    alerts.push(...await this._checkOverallActivity(userId, ipAddress));
    return alerts;
  }

  _getDLPType(action) {
    if (['download', 'bulk_download'].includes(action)) return 'bulk_download';
    if (['export', 'mass_export'].includes(action)) return 'mass_export';
    if (['share', 'share_link'].includes(action)) return 'rapid_share';
    return null;
  }

  async _checkBulkDownload(userId, timestamps, action, fileId, ipAddress) {
    const alerts = [];
    const config = this.suspiciousPatterns.bulkDownload;
    const recent = timestamps.filter(t => t > Date.now() - config.windowMs);
    if (recent.length >= config.threshold) {
      const alert = await this.createAlert('bulk_download', 'high', userId, fileId, ipAddress, action,
        `${recent.length} downloads in ${config.windowMs / 60000}min`);
      if (alert) alerts.push(alert);
    }
    return alerts;
  }

  async _checkMassExport(userId, timestamps, action, fileId, ipAddress) {
    const alerts = [];
    const config = this.suspiciousPatterns.massExport;
    const recent = timestamps.filter(t => t > Date.now() - config.windowMs);
    if (recent.length >= config.threshold) {
      const alert = await this.createAlert('mass_export', 'critical', userId, fileId, ipAddress, action,
        `${recent.length} exports in ${config.windowMs / 60000}min`);
      if (alert) alerts.push(alert);
    }
    return alerts;
  }

  async _checkRapidShare(userId, timestamps, action, fileId, ipAddress) {
    const alerts = [];
    const config = this.suspiciousPatterns.rapidShare;
    const recent = timestamps.filter(t => t > Date.now() - config.windowMs);
    if (recent.length >= config.threshold) {
      const alert = await this.createAlert('rapid_share', 'medium', userId, fileId, ipAddress, action,
        `${recent.length} shares in ${config.windowMs / 60000}min`);
      if (alert) alerts.push(alert);
    }
    return alerts;
  }

  async _checkOverallActivity(userId, ipAddress) {
    const alerts = [];
    try {
      const recentCount = await query(
        `SELECT COUNT(*)::int AS count FROM file_access_logs WHERE user_id = $1
         AND created_at > CURRENT_TIMESTAMP - INTERVAL '1 hour'`,
        [userId]
      );
      if (recentCount.rows[0].count > 100) {
        const alert = await this.createAlert('abnormal_activity', 'high', userId, null, ipAddress, 'high_frequency',
          `${recentCount.rows[0].count} actions in last hour`);
        if (alert) alerts.push(alert);
      }
    } catch (e) { logger.error('DLP check error', { error: e.message }); }
    return alerts;
  }

  async createAlert(alertType, severity, userId, fileId, ipAddress, action, details) {
    try {
      const result = await query(
        `INSERT INTO file_dlp_alerts (alert_type, severity, user_id, file_id, ip_address, action, details)
         VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb) RETURNING id`,
        [alertType, severity, userId, fileId, ipAddress, action, JSON.stringify({ description: details })]
      );
      logger.warn('DLP alert created', { alertType, severity, userId });
      return result.rows[0].id;
    } catch (e) {
      logger.error('Failed to create DLP alert', { error: e.message });
      return null;
    }
  }

  async getAlerts(filters = {}) {
    let sql = 'SELECT a.*, u.full_name AS user_name, f.original_name AS file_name FROM file_dlp_alerts a LEFT JOIN users u ON a.user_id = u.id LEFT JOIN file_security_files f ON a.file_id = f.id WHERE 1=1';
    const params = [];
    let paramIdx = 1;
    if (filters.severity) { sql += ` AND a.severity = $${paramIdx++}`; params.push(filters.severity); }
    if (filters.alertType) { sql += ` AND a.alert_type = $${paramIdx++}`; params.push(filters.alertType); }
    if (filters.resolved !== undefined) { sql += ` AND a.is_resolved = $${paramIdx++}`; params.push(filters.resolved); }
    sql += ' ORDER BY a.created_at DESC LIMIT $' + paramIdx++;
    params.push(parseInt(filters.limit) || 50);
    const result = await query(sql, params);
    return result.rows;
  }

  async resolveAlert(alertId, resolvedBy) {
    await query(
      'UPDATE file_dlp_alerts SET is_resolved = true, resolved_by = $1, resolved_at = CURRENT_TIMESTAMP WHERE id = $2',
      [resolvedBy, alertId]
    );
    return true;
  }

  async getStats() {
    const [total, critical, byType] = await Promise.all([
      query('SELECT COUNT(*)::int AS count FROM file_dlp_alerts'),
      query("SELECT COUNT(*)::int AS count FROM file_dlp_alerts WHERE severity = 'critical' AND is_resolved = false"),
      query('SELECT alert_type, COUNT(*)::int AS count FROM file_dlp_alerts GROUP BY alert_type ORDER BY count DESC'),
    ]);
    return { total: total.rows[0].count, unresolvedCritical: critical.rows[0].count, byType: byType.rows };
  }
}

module.exports = new DLPService();
