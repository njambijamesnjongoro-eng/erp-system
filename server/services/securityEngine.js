const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { query } = require('../config/db');
const logger = require('../utils/logger');

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{12,}$/;

const LOCK_DURATIONS = [10, 30, 1440];

const captchaStore = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of captchaStore) {
    if (val.expiresAt < now) captchaStore.delete(key);
  }
}, 60000);

async function validatePasswordStrength(password) {
  if (!PASSWORD_REGEX.test(password)) {
    throw new Error('Password must be at least 12 characters with uppercase, lowercase, number, and special character');
  }
}

async function checkPasswordHistory(userId, newPassword) {
  const recent = await query(
    'SELECT password_hash FROM password_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5',
    [userId]
  );
  for (const row of recent.rows) {
    if (await bcrypt.compare(newPassword, row.password_hash)) {
      throw new Error('Cannot reuse a recent password');
    }
  }
}

async function recordPasswordHistory(userId, passwordHash) {
  try {
    await query(
      'INSERT INTO password_history (user_id, password_hash) VALUES ($1, $2)',
      [userId, passwordHash]
    );
    await query(
      `DELETE FROM password_history WHERE user_id = $1 AND id NOT IN (
        SELECT id FROM password_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5
      )`, [userId]
    );
  } catch (e) {
    logger.error('Failed to record password history', { error: e.message });
  }
}

async function handleFailedLogin(user) {
  const attempts = (user.login_attempts || 0) + 1;
  const lockCount = user.lock_count || 0;
  const durationIndex = Math.min(lockCount, LOCK_DURATIONS.length - 1);
  const lockMinutes = LOCK_DURATIONS[durationIndex];
  const lockUntil = new Date(Date.now() + lockMinutes * 60 * 1000);

  if (attempts >= 3) {
    const newLockCount = lockCount + 1;
    await query(
      `UPDATE users SET login_attempts = $1, is_locked = true, locked_until = $2,
       lock_count = $3, last_failed_login = CURRENT_TIMESTAMP WHERE id = $4`,
      [attempts, lockUntil, newLockCount, user.id]
    );
    if (newLockCount >= 3) {
      await logSecurityEvent(user.id, 'account_locked_24h', 'critical',
        `Account locked for 24 hours after ${newLockCount} lockout events`, null, null);
      await queueEmail(user.email, 'Critical Security Alert - Account Locked',
        `Your account has been locked for 24 hours due to repeated failed login attempts. Contact your administrator immediately.`);
    } else {
      await logSecurityEvent(user.id, 'account_locked', 'warning',
        `Account locked for ${lockMinutes} minutes (lockout #${newLockCount})`, null, null);
      await queueEmail(user.email, 'Security Alert - Account Locked',
        `Your account has been temporarily locked for ${lockMinutes} minutes due to failed login attempts.`);
    }
    return { locked: true, minutes: lockMinutes };
  }

  await query(
    'UPDATE users SET login_attempts = $1, last_failed_login = CURRENT_TIMESTAMP WHERE id = $2',
    [attempts, user.id]
  );
  return { locked: false, remaining: 3 - attempts };
}

async function checkCaptchaRequired(userId) {
  if (!userId) return false;
  const user = await query('SELECT login_attempts FROM users WHERE id = $1', [userId]);
  return (user.rows[0]?.login_attempts || 0) >= 2;
}

async function generateCaptcha() {
  const a = Math.floor(Math.random() * 20) + 1;
  const b = Math.floor(Math.random() * 20) + 1;
  const ops = ['+', '-', '*'];
  const op = ops[Math.floor(Math.random() * ops.length)];
  let answer;
  switch (op) {
    case '+': answer = a + b; break;
    case '-': answer = a - b; break;
    case '*': answer = a * b; break;
  }
  const token = crypto.randomBytes(16).toString('hex');
  captchaStore.set(token, { answer, expiresAt: Date.now() + 5 * 60 * 1000 });
  return { question: `${a} ${op} ${b} = ?`, token };
}

async function verifyCaptcha(token, answer) {
  const entry = captchaStore.get(token);
  if (!entry || entry.expiresAt < Date.now()) return false;
  if (entry.answer !== answer) return false;
  captchaStore.delete(token);
  return true;
}

async function trackDevice(userId, deviceInfo) {
  try {
    const existing = await query(
      `SELECT id FROM trusted_devices WHERE user_id = $1 AND fingerprint = $2`,
      [userId, deviceInfo.fingerprint]
    );
    if (existing.rows.length > 0) {
      await query('UPDATE trusted_devices SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1', [existing.rows[0].id]);
      return { known: true, deviceId: existing.rows[0].id };
    }
    await query(
      `INSERT INTO trusted_devices (user_id, device_name, browser, os, ip_address, fingerprint)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, deviceInfo.deviceName, deviceInfo.browser, deviceInfo.os, deviceInfo.ip, deviceInfo.fingerprint]
    );
    await queueEmail(
      (await query('SELECT email FROM users WHERE id = $1', [userId])).rows[0]?.email,
      'New Device Login Detected',
      `A new device logged into your account.\nDevice: ${deviceInfo.deviceName || 'Unknown'}\nBrowser: ${deviceInfo.browser || 'Unknown'}\nIP: ${deviceInfo.ip || 'Unknown'}\nTime: ${new Date().toLocaleString()}`
    );
    return { known: false };
  } catch (e) {
    logger.error('Failed to track device', { error: e.message });
    return { known: true };
  }
}

async function logSecurityEvent(userId, eventType, severity, description, ipAddress, userAgent) {
  try {
    await query(
      `INSERT INTO security_events (user_id, event_type, severity, description, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, eventType, severity, description, ipAddress, userAgent]
    );
  } catch (e) {
    logger.error('Failed to log security event', { error: e.message });
  }
}

async function queueEmail(recipient, subject, body) {
  try {
    await query(
      'INSERT INTO email_queue (recipient, subject, body) VALUES ($1, $2, $3)',
      [recipient, subject, body]
    );
  } catch (e) {
    logger.error('Failed to queue email', { error: e.message });
  }
}

async function getActiveSessions(userId) {
  const result = await query(
    `SELECT id, ip_address, user_agent, device_info AS device, login_at, last_activity
     FROM user_sessions WHERE user_id = $1 AND is_active = true ORDER BY last_activity DESC`,
    [userId]
  );
  return result.rows;
}

async function terminateSession(sessionId, userId) {
  await query(
    'UPDATE user_sessions SET is_active = false WHERE id = $1 AND user_id = $2',
    [sessionId, userId]
  );
}

async function terminateAllSessions(userId, excludeSessionId) {
  if (excludeSessionId) {
    await query(
      'UPDATE user_sessions SET is_active = false WHERE user_id = $1 AND id != $2',
      [userId, excludeSessionId]
    );
  } else {
    await query(
      'UPDATE user_sessions SET is_active = false WHERE user_id = $1',
      [userId]
    );
  }
  await query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
}

async function getTrustedDevices(userId) {
  const result = await query(
    'SELECT * FROM trusted_devices WHERE user_id = $1 ORDER BY last_used_at DESC',
    [userId]
  );
  return result.rows;
}

async function removeTrustedDevice(deviceId, userId) {
  await query(
    'DELETE FROM trusted_devices WHERE id = $1 AND user_id = $2',
    [deviceId, userId]
  );
}

async function getSecurityEvents(userId, limit = 50) {
  const result = await query(
    'SELECT * FROM security_events WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
    [userId, limit]
  );
  return result.rows;
}

async function getSecurityDashboardStats() {
  const [lockedAccounts, recentFailures, activeSessions, todayEvents] = await Promise.all([
    query("SELECT COUNT(*)::int AS count FROM users WHERE is_locked = true AND locked_until > CURRENT_TIMESTAMP"),
    query("SELECT COUNT(*)::int AS count FROM authentication_logs WHERE status = 'FAILED' AND created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'"),
    query("SELECT COUNT(*)::int AS count FROM user_sessions WHERE is_active = true"),
    query("SELECT COUNT(*)::int AS count FROM security_events WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'"),
  ]);
  return {
    lockedAccounts: lockedAccounts.rows[0].count,
    recentFailures: recentFailures.rows[0].count,
    activeSessions: activeSessions.rows[0].count,
    events24h: todayEvents.rows[0].count,
  };
}

module.exports = {
  validatePasswordStrength,
  checkPasswordHistory,
  recordPasswordHistory,
  handleFailedLogin,
  checkCaptchaRequired,
  generateCaptcha,
  verifyCaptcha,
  trackDevice,
  logSecurityEvent,
  queueEmail,
  getActiveSessions,
  terminateSession,
  terminateAllSessions,
  getTrustedDevices,
  removeTrustedDevice,
  getSecurityEvents,
  getSecurityDashboardStats,
};
