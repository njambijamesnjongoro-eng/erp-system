const { query } = require('../config/db');
const logger = require('../utils/logger');

class SOCAlertManager {
  async createAlert(alert) {
    try {
      const result = await query(
        `INSERT INTO soc_alerts (alert_type, severity, title, description, source, source_id,
         user_id, ip_address, device_id, geo_country, geo_city, action, resource, risk_score, details)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb) RETURNING *`,
        [alert.type, alert.severity || 'medium', alert.title, alert.description || null,
         alert.source || 'system', alert.sourceId || null,
         alert.userId || null, alert.ip || null, alert.deviceId || null,
         alert.geoCountry || null, alert.geoCity || null, alert.action || null,
         alert.resource || null, alert.riskScore || 0, alert.details || {}]
      );
      logger.warn('SOC alert created', { id: result.rows[0].id, type: alert.type, severity: alert.severity });
      await this._autoEscalate(result.rows[0]);
      return result.rows[0];
    } catch (err) { logger.error('Failed to create SOC alert', { error: err.message }); return null; }
  }

  async acknowledgeAlert(alertId, userId) {
    await query('UPDATE soc_alerts SET status = $1, acknowledged_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['acknowledged', alertId]);
    return true;
  }

  async assignAlert(alertId, assigneeId) {
    await query('UPDATE soc_alerts SET assigned_to = $1 WHERE id = $2', [assigneeId, alertId]);
    return true;
  }

  async resolveAlert(alertId, userId, notes) {
    await query(
      `UPDATE soc_alerts SET status = 'resolved', resolved_by = $1, resolved_at = CURRENT_TIMESTAMP,
       resolution_notes = $2 WHERE id = $3`,
      [userId, notes, alertId]
    );
    return true;
  }

  async getAlerts(filters = {}) {
    let sql = `SELECT a.*, u.full_name AS assigned_name, u2.full_name AS resolved_by_name
               FROM soc_alerts a
               LEFT JOIN users u ON a.assigned_to = u.id
               LEFT JOIN users u2 ON a.resolved_by = u2.id WHERE 1=1`;
    const params = []; let idx = 1;
    if (filters.severity) { sql += ` AND a.severity = $${idx++}`; params.push(filters.severity); }
    if (filters.status) { sql += ` AND a.status = $${idx++}`; params.push(filters.status); }
    if (filters.alertType) { sql += ` AND a.alert_type = $${idx++}`; params.push(filters.alertType); }
    if (filters.userId) { sql += ` AND a.user_id = $${idx++}`; params.push(filters.userId); }
    if (filters.assignedTo) { sql += ` AND a.assigned_to = $${idx++}`; params.push(filters.assignedTo); }
    if (filters.search) { sql += ` AND (a.title ILIKE $${idx} OR a.description ILIKE $${idx})`; params.push(`%${filters.search}%`); idx++; }
    sql += ' ORDER BY a.created_at DESC LIMIT $' + (idx++) + ' OFFSET $' + (idx++);
    params.push(parseInt(filters.limit) || 50, parseInt(filters.offset) || 0);
    const result = await query(sql, params);
    return result.rows;
  }

  async getAlertStats() {
    const [total, bySeverity, byStatus, byType, recentCount] = await Promise.all([
      query('SELECT COUNT(*)::int AS count FROM soc_alerts'),
      query('SELECT severity, COUNT(*)::int AS count FROM soc_alerts GROUP BY severity'),
      query('SELECT status, COUNT(*)::int AS count FROM soc_alerts GROUP BY status'),
      query('SELECT alert_type, COUNT(*)::int AS count FROM soc_alerts GROUP BY alert_type ORDER BY count DESC'),
      query("SELECT COUNT(*)::int AS count FROM soc_alerts WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'"),
    ]);
    return {
      total: total.rows[0].count,
      bySeverity: bySeverity.rows,
      byStatus: byStatus.rows,
      byType: byType.rows,
      last24h: recentCount.rows[0].count,
    };
  }

  async _autoEscalate(alert) {
    try {
      const rules = await query(
        `SELECT * FROM soc_escalation_rules WHERE is_active = true
         AND (alert_type IS NULL OR alert_type = $1)
         AND (severity IS NULL OR severity = $2)
         AND min_risk_score <= $3
         ORDER BY escalation_level DESC LIMIT 1`,
        [alert.alert_type, alert.severity, alert.risk_score]
      );
      if (rules.rows.length > 0) {
        const rule = rules.rows[0];
        await query('UPDATE soc_alerts SET escalation_level = $1 WHERE id = $2',
          [rule.escalation_level, alert.id]);
        logger.info('Alert auto-escalated', { alertId: alert.id, level: rule.escalation_level });
      }
    } catch (e) { logger.error('Auto-escalation failed', { error: e.message }); }
  }
}

module.exports = new SOCAlertManager();
