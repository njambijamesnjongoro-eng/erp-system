const { query } = require('../config/db');
const logger = require('../utils/logger');

class SOCNotificationService {
  async sendNotification(userId, notif) {
    try {
      const result = await query(
        `INSERT INTO soc_notifications (user_id, notification_type, title, message, channel, related_alert_id, related_incident_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [userId, notif.type || 'general', notif.title, notif.message || null,
         notif.channel || 'in_app', notif.relatedAlertId || null, notif.relatedIncidentId || null]
      );
      return result.rows[0];
    } catch (err) { logger.error('Failed to send notification', { error: err.message }); return null; }
  }

  async notifySecurityTeam(alert) {
    const admins = await query(
      "SELECT id FROM users WHERE role_name = 'System Admin' OR role_name = 'CEO'"
    );
    for (const admin of admins.rows) {
      await this.sendNotification(admin.id, {
        type: 'security_alert',
        title: `[${alert.severity.toUpperCase()}] ${alert.title}`,
        message: alert.description || 'New security alert requires attention',
        relatedAlertId: alert.id,
      });
    }
  }

  async getUserNotifications(userId, filters = {}) {
    let sql = 'SELECT * FROM soc_notifications WHERE user_id = $1';
    const params = [userId]; let idx = 2;
    if (filters.unread) { sql += ' AND is_read = false'; }
    if (filters.type) { sql += ` AND notification_type = $${idx++}`; params.push(filters.type); }
    sql += ' ORDER BY created_at DESC LIMIT 50';
    return (await query(sql, params)).rows;
  }

  async markAsRead(notificationId) {
    await query('UPDATE soc_notifications SET is_read = true, read_at = CURRENT_TIMESTAMP WHERE id = $1', [notificationId]);
    return true;
  }

  async markAllAsRead(userId) {
    await query("UPDATE soc_notifications SET is_read = true, read_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND is_read = false", [userId]);
    return true;
  }

  async getUnreadCount(userId) {
    const result = await query('SELECT COUNT(*)::int AS count FROM soc_notifications WHERE user_id = $1 AND is_read = false', [userId]);
    return result.rows[0].count;
  }
}

module.exports = new SOCNotificationService();
