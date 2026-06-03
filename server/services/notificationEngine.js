const db = require('../config/db');

class NotificationEngine {
  static async sendNotification(userId, type, title, message, referenceType = null, referenceId = null) {
    const prefs = await db.query(
      `SELECT in_app_notifications FROM notification_preferences WHERE user_id = $1`,
      [userId]
    );
    if (prefs.rows.length > 0 && !prefs.rows[0].in_app_notifications) {
      return null;
    }
    const result = await db.query(
      `INSERT INTO notifications (user_id, type, title, message, reference_type, reference_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [userId, type, title, message, referenceType, referenceId]
    );
    return result.rows[0];
  }

  static async sendBulkNotification(userIds, type, title, message, referenceType = null, referenceId = null) {
    const results = [];
    for (const userId of userIds) {
      const notif = await this.sendNotification(userId, type, title, message, referenceType, referenceId);
      if (notif) results.push(notif);
    }
    return results;
  }

  static async notifyApprovers(entityType, entityId, title, message) {
    let permissionResource;
    switch (entityType) {
      case 'procurement': permissionResource = 'procurement_requests'; break;
      case 'leave': permissionResource = 'leave_requests'; break;
      case 'expense': permissionResource = 'expenses'; break;
      default: permissionResource = entityType;
    }
    const approvers = await db.query(
      `SELECT DISTINCT u.id AS user_id
       FROM users u
       JOIN role_permissions rp ON u.role_id = rp.role_id
       JOIN permissions p ON rp.permission_id = p.id
       WHERE p.resource = $1 AND p.action IN ('approve', 'approve_all') AND u.is_active = true`,
      [permissionResource]
    );
    const notifications = [];
    for (const approver of approvers.rows) {
      const notif = await this.sendNotification(approver.user_id, 'approval_request', title, message, entityType, entityId);
      if (notif) notifications.push(notif);
    }
    return notifications;
  }

  static async notifyDepartmentManager(departmentId, type, title, message) {
    const manager = await db.query(
      `SELECT ep.id AS employee_id, u.id AS user_id
       FROM employee_profiles ep
       JOIN users u ON ep.user_id = u.id
       JOIN roles r ON u.role_id = r.id
       WHERE ep.department_id = $1 AND r.name = 'Manager' AND ep.employment_status = 'active'
       LIMIT 1`,
      [departmentId]
    );
    if (manager.rows.length === 0) return null;
    return await this.sendNotification(manager.rows[0].user_id, type, title, message);
  }

  static async getUserNotifications(userId, filters = {}) {
    let sql = `SELECT * FROM notifications WHERE user_id = $1`;
    const params = [userId];
    let paramIndex = 2;

    if (filters.is_read !== undefined) {
      sql += ` AND is_read = $${paramIndex++}`;
      params.push(filters.is_read);
    }
    if (filters.type) {
      sql += ` AND type = $${paramIndex++}`;
      params.push(filters.type);
    }
    if (filters.dateFrom) {
      sql += ` AND created_at >= $${paramIndex++}`;
      params.push(filters.dateFrom);
    }
    if (filters.dateTo) {
      sql += ` AND created_at <= $${paramIndex++}`;
      params.push(filters.dateTo);
    }
    sql += ` ORDER BY created_at DESC`;
    if (filters.limit) {
      sql += ` LIMIT $${paramIndex++}`;
      params.push(filters.limit);
    } else {
      sql += ` LIMIT 50`;
    }
    if (filters.offset) {
      sql += ` OFFSET $${paramIndex++}`;
      params.push(filters.offset);
    }
    const result = await db.query(sql, params);
    return result.rows;
  }

  static async getUnreadCount(userId) {
    const result = await db.query(
      `SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = false AND is_archived = false`,
      [userId]
    );
    return result.rows[0].count;
  }

  static async markAsRead(notificationId, userId) {
    const result = await db.query(
      `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING *`,
      [notificationId, userId]
    );
    if (result.rows.length === 0) throw new Error('Notification not found');
    return result.rows[0];
  }

  static async markAllAsRead(userId) {
    const result = await db.query(
      `UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false RETURNING COUNT(*)::int AS updated`,
      [userId]
    );
    return { updated: result.rows[0].updated };
  }

  static async archiveNotification(notificationId, userId) {
    const result = await db.query(
      `UPDATE notifications SET is_archived = true WHERE id = $1 AND user_id = $2 RETURNING *`,
      [notificationId, userId]
    );
    if (result.rows.length === 0) throw new Error('Notification not found');
    return result.rows[0];
  }

  static async deleteNotification(notificationId, userId) {
    const result = await db.query(
      `DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id`,
      [notificationId, userId]
    );
    if (result.rows.length === 0) throw new Error('Notification not found');
    return { deleted: true };
  }

  static async getPreferences(userId) {
    const result = await db.query(
      `SELECT * FROM notification_preferences WHERE user_id = $1`,
      [userId]
    );
    return result.rows[0] || null;
  }

  static async updatePreferences(userId, preferences) {
    const existing = await db.query(
      `SELECT id FROM notification_preferences WHERE user_id = $1`,
      [userId]
    );
    if (existing.rows.length > 0) {
      const result = await db.query(
        `UPDATE notification_preferences
         SET email_notifications = $1, in_app_notifications = $2, sms_notifications = $3,
             push_notifications = $4, categories = $5, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $6 RETURNING *`,
        [
          preferences.email_notifications ?? true,
          preferences.in_app_notifications ?? true,
          preferences.sms_notifications ?? false,
          preferences.push_notifications ?? false,
          JSON.stringify(preferences.categories || []),
          userId,
        ]
      );
      return result.rows[0];
    }
    const result = await db.query(
      `INSERT INTO notification_preferences (user_id, email_notifications, in_app_notifications, sms_notifications, push_notifications, categories)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        userId,
        preferences.email_notifications ?? true,
        preferences.in_app_notifications ?? true,
        preferences.sms_notifications ?? false,
        preferences.push_notifications ?? false,
        JSON.stringify(preferences.categories || []),
      ]
    );
    return result.rows[0];
  }

  static async checkAndSendReminders() {
    const reminders = [];
    const insuranceExpiry = await db.query(
      `SELECT aip.*, a.asset_name FROM asset_insurance_policies aip
       LEFT JOIN assets a ON aip.asset_id = a.id
       WHERE aip.status = 'active' AND aip.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
       ORDER BY aip.end_date ASC`
    );
    for (const p of insuranceExpiry.rows) {
      const daysLeft = Math.ceil((new Date(p.end_date) - new Date()) / (1000 * 60 * 60 * 24));
      reminders.push({
        type: 'insurance_expiry',
        title: 'Insurance Policy Expiring',
        message: `Policy #${p.policy_number} for ${p.asset_name || 'Asset'} expires in ${daysLeft} days.`,
      });
    }
    const contractExpiry = await db.query(
      `SELECT sc.*, ps.supplier_name FROM supplier_contracts sc
       JOIN procurement_suppliers ps ON sc.supplier_id = ps.id
       WHERE sc.status = 'active' AND sc.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
       ORDER BY sc.end_date ASC`
    );
    for (const c of contractExpiry.rows) {
      reminders.push({
        type: 'contract_expiry',
        title: 'Supplier Contract Expiring',
        message: `Contract with ${c.supplier_name} (#${c.contract_number}) expires on ${c.end_date}.`,
      });
    }
    const maintenanceDue = await db.query(
      `SELECT mr.*, a.asset_name, fv.registration_number
       FROM maintenance_records mr
       LEFT JOIN assets a ON mr.asset_id = a.id
       LEFT JOIN fleet_vehicles fv ON mr.vehicle_id = fv.id
       WHERE mr.status IN ('pending', 'scheduled')
         AND mr.scheduled_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
       ORDER BY mr.scheduled_date ASC`
    );
    for (const m of maintenanceDue.rows) {
      reminders.push({
        type: 'maintenance_due',
        title: 'Maintenance Scheduled',
        message: `Maintenance for ${m.asset_name || m.registration_number || 'Asset'} is scheduled on ${m.scheduled_date}.`,
      });
    }
    const admins = await db.query(
      `SELECT u.id FROM users u JOIN roles r ON u.role_id = r.id
       WHERE r.name IN ('System Admin', 'CEO') AND u.is_active = true`
    );
    const adminIds = admins.rows.map(a => a.user_id);
    for (const reminder of reminders) {
      await this.sendBulkNotification(adminIds, reminder.type, reminder.title, reminder.message);
    }
    return reminders;
  }

  static async sendSystemAlert(level, title, message) {
    const admins = await db.query(
      `SELECT u.id FROM users u JOIN roles r ON u.role_id = r.id
       WHERE r.name IN ('System Admin', 'CEO') AND u.is_active = true`
    );
    const notifications = [];
    for (const admin of admins.rows) {
      const notif = await this.sendNotification(admin.id, 'system_alert', title, message);
      if (notif) notifications.push(notif);
    }
    if (notifications.length > 0) {
      await db.query(
        `INSERT INTO system_logs (level, message, source) VALUES ($1, $2, $3)`,
        [level, `[ALERT] ${title}: ${message}`, 'notificationEngine']
      );
    }
    return notifications;
  }
}

module.exports = NotificationEngine;
