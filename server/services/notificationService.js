const { query } = require('../config/db');
const logger = require('../utils/logger');
const { queueEmail } = require('./securityEngine');

const ALERT_TEMPLATES = {
  new_device_login: {
    title: 'New Device Login',
    severity: 'warning',
    message: (d) => `A new device logged into your account.\nDevice: ${d.deviceName || 'Unknown'}\nBrowser: ${d.browser || 'Unknown'}\nLocation: ${d.location || 'Unknown'}\nIP: ${d.ip || 'Unknown'}`,
    emailSubject: (d) => 'Security Alert: New Device Login',
  },
  mfa_disabled: {
    title: 'MFA Disabled',
    severity: 'high',
    message: (d) => 'Multi-factor authentication was disabled on your account. If you did not perform this action, contact your administrator immediately.',
    emailSubject: () => 'Security Alert: MFA Disabled',
  },
  mfa_enabled: {
    title: 'MFA Enabled',
    severity: 'info',
    message: (d) => 'Multi-factor authentication was enabled on your account.',
    emailSubject: () => 'Security Alert: MFA Enabled',
  },
  password_changed: {
    title: 'Password Changed',
    severity: 'info',
    message: (d) => 'Your password was changed successfully. If you did not make this change, contact your administrator immediately.',
    emailSubject: () => 'Security Alert: Password Changed',
  },
  suspicious_login: {
    title: 'Suspicious Login Detected',
    severity: 'high',
    message: (d) => `A suspicious login was detected on your account.\nRisk Score: ${d.riskScore || 'N/A'}\nLocation: ${d.location || 'Unknown'}\nIP: ${d.ip || 'Unknown'}\nTime: ${d.time || 'Unknown'}`,
    emailSubject: (d) => 'URGENT: Suspicious Login Detected',
  },
  account_locked: {
    title: 'Account Locked',
    severity: 'high',
    message: (d) => `Your account has been locked due to multiple failed login attempts. It will be unlocked on ${d.unlockTime || 'later'}.`,
    emailSubject: () => 'Security Alert: Account Locked',
  },
  geo_anomaly: {
    title: 'Unusual Location Login',
    severity: 'warning',
    message: (d) => `Your account was accessed from an unusual location.\nLocation: ${d.location || 'Unknown'}\nIP: ${d.ip || 'Unknown'}\nIf this was you, no action needed. If not, contact your administrator.`,
    emailSubject: () => 'Security Alert: Unusual Location Login',
  },
  session_terminated: {
    title: 'Session Terminated',
    severity: 'info',
    message: (d) => `A session was terminated on your account.\nDevice: ${d.deviceName || 'Unknown'}\nBrowser: ${d.browser || 'Unknown'}`,
    emailSubject: () => 'Security Alert: Session Terminated',
  },
  recovery_code_used: {
    title: 'Recovery Code Used',
    severity: 'warning',
    message: (d) => 'A backup recovery code was used to access your account. If you did not perform this action, contact your administrator immediately.',
    emailSubject: () => 'Security Alert: Recovery Code Used',
  },
  device_approved: {
    title: 'Device Approved',
    severity: 'info',
    message: (d) => `A device was approved for trusted access.\nDevice: ${d.deviceName || 'Unknown'}\nBrowser: ${d.browser || 'Unknown'}`,
    emailSubject: () => 'Device Approved',
  },
};

async function createAlert(userId, alertType, metadata = {}, channels = ['in_app']) {
  const template = ALERT_TEMPLATES[alertType];
  if (!template) {
    logger.warn(`Unknown alert type: ${alertType}`);
    return;
  }

  const message = typeof template.message === 'function' ? template.message(metadata) : template.message;

  try {
    if (channels.includes('in_app')) {
      await query(
        `INSERT INTO security_alerts (user_id, alert_type, severity, title, message, metadata, channel)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, alertType, template.severity, template.title, message, JSON.stringify(metadata), 'in_app']
      );
    }

    if (channels.includes('email')) {
      const emailSubject = typeof template.emailSubject === 'function' ? template.emailSubject(metadata) : template.emailSubject;
      const user = await query('SELECT email FROM users WHERE id = $1', [userId]);
      if (user.rows.length > 0) {
        await queueEmail(user.rows[0].email, emailSubject, message);
      }
    }
  } catch (e) {
    logger.error('Failed to create alert', { error: e.message });
  }
}

async function getAlerts(userId, limit = 50, unreadOnly = false) {
  let sql = 'SELECT * FROM security_alerts WHERE user_id = $1';
  const params = [userId];
  if (unreadOnly) {
    sql += ' AND is_read = false';
  }
  sql += ' ORDER BY created_at DESC LIMIT $2';
  params.push(limit);
  const result = await query(sql, params);
  return result.rows;
}

async function markAlertRead(alertId, userId) {
  await query(
    'UPDATE security_alerts SET is_read = true, read_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2',
    [alertId, userId]
  );
}

async function markAllAlertsRead(userId) {
  await query(
    'UPDATE security_alerts SET is_read = true, read_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND is_read = false',
    [userId]
  );
}

async function getUnreadCount(userId) {
  const result = await query(
    'SELECT COUNT(*)::int AS count FROM security_alerts WHERE user_id = $1 AND is_read = false',
    [userId]
  );
  return result.rows[0].count;
}

module.exports = { createAlert, getAlerts, markAlertRead, markAllAlertsRead, getUnreadCount, ALERT_TEMPLATES };
