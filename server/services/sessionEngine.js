const db = require('../config/db');

class SessionEngine {
  static async createSession(userId, token, refreshToken, ipAddress, userAgent, deviceInfo) {
    const result = await db.query(
      `INSERT INTO user_sessions (user_id, token, refresh_token, ip_address, user_agent, device_info, is_active, created_at, last_activity)
       VALUES ($1, $2, $3, $4, $5, $6, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [userId, token, refreshToken, ipAddress, userAgent, deviceInfo ? JSON.stringify(deviceInfo) : null]
    );
    return result.rows[0];
  }

  static async getSession(token) {
    const result = await db.query(
      `SELECT us.*, u.email, r.name AS role_name, COALESCE(ep.full_name, u.email) AS username
       FROM user_sessions us
       JOIN users u ON us.user_id = u.id
       LEFT JOIN roles r ON u.role_id = r.id
       LEFT JOIN employee_profiles ep ON ep.user_id = u.id
       WHERE us.token = $1 AND us.is_active = true`,
      [token]
    );
    return result.rows[0] || null;
  }

  static async refreshSession(sessionId, newToken, newRefreshToken) {
    const result = await db.query(
      `UPDATE user_sessions SET token = $1, refresh_token = $2, last_activity = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *`,
      [newToken, newRefreshToken, sessionId]
    );
    return result.rows[0];
  }

  static async getUserSessions(userId) {
    const result = await db.query(
      `SELECT id, user_id, ip_address, user_agent, device_info, is_active, created_at, last_activity, logout_at
       FROM user_sessions WHERE user_id = $1 ORDER BY last_activity DESC`,
      [userId]
    );
    return result.rows;
  }

  static async terminateSession(sessionId) {
    const result = await db.query(
      `UPDATE user_sessions SET is_active = false, logout_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [sessionId]
    );
    return result.rows[0];
  }

  static async terminateAllUserSessions(userId) {
    const result = await db.query(
      `UPDATE user_sessions SET is_active = false, logout_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND is_active = true RETURNING *`,
      [userId]
    );
    return result.rows;
  }

  static async getActiveSessions(limit = 50) {
    const result = await db.query(
      `SELECT us.*, u.email, r.name AS role_name, COALESCE(ep.full_name, u.email) AS username
       FROM user_sessions us
       JOIN users u ON us.user_id = u.id
       LEFT JOIN roles r ON u.role_id = r.id
       LEFT JOIN employee_profiles ep ON ep.user_id = u.id
       WHERE us.is_active = true
       ORDER BY us.last_activity DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  static async getActiveSessionCount() {
    const result = await db.query(
      `SELECT COUNT(*)::int AS count FROM user_sessions WHERE is_active = true`
    );
    return result.rows[0].count;
  }

  static async getOnlineUsers() {
    const result = await db.query(
      `SELECT COUNT(DISTINCT user_id)::int AS online_count,
              json_agg(DISTINCT jsonb_build_object(
                'user_id', u.id,
                'username', COALESCE(ep.full_name, u.email),
                'email', u.email,
                'last_activity', us.last_activity,
                'ip_address', us.ip_address
              )) AS users
       FROM user_sessions us
       JOIN users u ON us.user_id = u.id
       LEFT JOIN employee_profiles ep ON ep.user_id = u.id
       WHERE us.is_active = true AND us.last_activity >= CURRENT_TIMESTAMP - INTERVAL '15 minutes'`
    );
    return result.rows[0];
  }

  static async cleanupExpired() {
    const result = await db.query(
      `UPDATE user_sessions SET is_active = false, logout_at = CURRENT_TIMESTAMP
       WHERE is_active = true AND last_activity < CURRENT_TIMESTAMP - INTERVAL '24 hours'
       RETURNING id`
    );
    return { cleaned: result.rowCount };
  }
}

module.exports = SessionEngine;
