const db = require('../config/db');

class SystemMonitor {
  static async logEvent(level, message, source, endpoint = null, method = null, responseTime = null, statusCode = null, userId = null, ipAddress = null, userAgent = null, stackTrace = null, metadata = {}) {
    const result = await db.query(
      `INSERT INTO system_logs (level, message, source, endpoint, method, response_time, status_code, user_id, ip_address, user_agent, stack_trace, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [level, message, source, endpoint, method, responseTime, statusCode, userId, ipAddress, userAgent, stackTrace, JSON.stringify(metadata)]
    );
    return result.rows[0];
  }

  static async logActivity(userId, action, description, entityType = null, entityId = null, metadata = {}, ipAddress = null) {
    const result = await db.query(
      `INSERT INTO activity_feed (user_id, action, description, entity_type, entity_id, metadata, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [userId, action, description, entityType, entityId, JSON.stringify(metadata), ipAddress]
    );
    return result.rows[0];
  }

  static async getSystemHealth() {
    const dbStatus = await db.query(`SELECT 1 AS ok`).then(() => 'connected').catch(() => 'disconnected');

    const activeUsers = await db.query(
      `SELECT COUNT(*)::int AS count FROM users WHERE is_active = true`
    );

    const activeSessions = await db.query(
      `SELECT COUNT(DISTINCT user_id)::int AS count
       FROM activity_feed
       WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'`
    );

    const avgResponseTime = await db.query(
      `SELECT COALESCE(AVG(response_time), 0)::int AS avg_ms
       FROM system_logs
       WHERE level = 'info' AND response_time IS NOT NULL
         AND created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'`
    );

    const errorRate = await db.query(
      `WITH total AS (
        SELECT COUNT(*)::int AS count FROM system_logs
        WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
      ),
      errors AS (
        SELECT COUNT(*)::int AS count FROM system_logs
        WHERE level IN ('error', 'critical') AND created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
      )
      SELECT total.count AS total_requests, errors.count AS error_count,
        CASE WHEN total.count > 0
          THEN ROUND((errors.count::numeric / total.count) * 100, 2)
          ELSE 0
        END AS error_rate
      FROM total, errors`
    );

    const recentErrors = await db.query(
      `SELECT id, message, source, created_at
       FROM system_logs
       WHERE level IN ('error', 'critical')
       ORDER BY created_at DESC LIMIT 10`
    );

    return {
      database: dbStatus,
      activeUsers: activeUsers.rows[0].count,
      activeSessions24h: activeSessions.rows[0].count,
      avgResponseTime24h: avgResponseTime.rows[0].avg_ms,
      errorRate: errorRate.rows[0],
      recentErrors: recentErrors.rows,
      timestamp: new Date().toISOString(),
    };
  }

  static async getPerformanceMetrics(hours = 24) {
    const avgByEndpoint = await db.query(
      `SELECT endpoint, method,
        COUNT(*)::int AS request_count,
        COALESCE(AVG(response_time), 0)::int AS avg_response_time,
        MAX(response_time)::int AS max_response_time,
        COALESCE(SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END), 0)::int AS error_count
       FROM system_logs
       WHERE created_at >= CURRENT_TIMESTAMP - ($1 || ' hours')::interval
         AND endpoint IS NOT NULL
       GROUP BY endpoint, method
       ORDER BY avg_response_time DESC`,
      [hours]
    );

    const byMethod = await db.query(
      `SELECT method, COUNT(*)::int AS count
       FROM system_logs
       WHERE created_at >= CURRENT_TIMESTAMP - ($1 || ' hours')::interval
         AND method IS NOT NULL
       GROUP BY method ORDER BY count DESC`,
      [hours]
    );

    const byStatusCode = await db.query(
      `SELECT status_code, COUNT(*)::int AS count
       FROM system_logs
       WHERE created_at >= CURRENT_TIMESTAMP - ($1 || ' hours')::interval
         AND status_code IS NOT NULL
       GROUP BY status_code ORDER BY status_code`,
      [hours]
    );

    const slowestEndpoints = await db.query(
      `SELECT endpoint, method,
        COALESCE(AVG(response_time), 0)::int AS avg_response_time,
        COUNT(*)::int AS request_count
       FROM system_logs
       WHERE created_at >= CURRENT_TIMESTAMP - ($1 || ' hours')::interval
         AND endpoint IS NOT NULL AND response_time IS NOT NULL
       GROUP BY endpoint, method
       HAVING COUNT(*) > 5
       ORDER BY avg_response_time DESC LIMIT 10`,
      [hours]
    );

    return {
      byEndpoint: avgByEndpoint.rows,
      byMethod: byMethod.rows,
      byStatusCode: byStatusCode.rows,
      slowestEndpoints: slowestEndpoints.rows,
    };
  }

  static async getUserActivityStats(days = 30) {
    const loginsPerDay = await db.query(
      `SELECT DATE(created_at) AS date, COUNT(*)::int AS login_count
       FROM authentication_logs
       WHERE action = 'LOGIN' AND status = 'SUCCESS'
         AND created_at >= CURRENT_DATE - ($1 || ' days')::interval
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      [days]
    );

    const activeUsersPerDay = await db.query(
      `SELECT DATE(created_at) AS date, COUNT(DISTINCT user_id)::int AS active_users
       FROM activity_feed
       WHERE created_at >= CURRENT_DATE - ($1 || ' days')::interval
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      [days]
    );

    const mostActiveUsers = await db.query(
      `SELECT af.user_id, u.email,
        COUNT(*)::int AS activity_count,
        MAX(af.created_at) AS last_active
       FROM activity_feed af
       JOIN users u ON af.user_id = u.id
       WHERE af.created_at >= CURRENT_DATE - ($1 || ' days')::interval
       GROUP BY af.user_id, u.email
       ORDER BY activity_count DESC LIMIT 10`,
      [days]
    );

    const activityByHour = await db.query(
      `SELECT EXTRACT(HOUR FROM created_at)::int AS hour, COUNT(*)::int AS count
       FROM activity_feed
       WHERE created_at >= CURRENT_DATE - ($1 || ' days')::interval
       GROUP BY hour ORDER BY hour`,
      [days]
    );

    return {
      loginsPerDay: loginsPerDay.rows,
      activeUsersPerDay: activeUsersPerDay.rows,
      mostActiveUsers: mostActiveUsers.rows,
      activityByHour: activityByHour.rows,
    };
  }

  static async getErrorLogs(filters = {}) {
    let sql = `SELECT * FROM system_logs WHERE level IN ('error', 'critical')`;
    const params = [];
    let idx = 1;

    if (filters.level) {
      sql += ` AND level = $${idx++}`;
      params.push(filters.level);
    }
    if (filters.source) {
      sql += ` AND source = $${idx++}`;
      params.push(filters.source);
    }
    if (filters.dateFrom) {
      sql += ` AND created_at >= $${idx++}`;
      params.push(filters.dateFrom);
    }
    if (filters.dateTo) {
      sql += ` AND created_at <= $${idx++}`;
      params.push(filters.dateTo);
    }
    sql += ` ORDER BY created_at DESC`;
    if (filters.limit) {
      sql += ` LIMIT $${idx++}`;
      params.push(filters.limit);
    } else {
      sql += ` LIMIT 100`;
    }
    if (filters.offset) {
      sql += ` OFFSET $${idx++}`;
      params.push(filters.offset);
    }
    const result = await db.query(sql, params);
    return result.rows;
  }

  static async getSystemLogs(filters = {}) {
    let sql = `SELECT * FROM system_logs WHERE 1=1`;
    const params = [];
    let idx = 1;

    if (filters.level) {
      sql += ` AND level = $${idx++}`;
      params.push(filters.level);
    }
    if (filters.source) {
      sql += ` AND source = $${idx++}`;
      params.push(filters.source);
    }
    if (filters.dateFrom) {
      sql += ` AND created_at >= $${idx++}`;
      params.push(filters.dateFrom);
    }
    if (filters.dateTo) {
      sql += ` AND created_at <= $${idx++}`;
      params.push(filters.dateTo);
    }
    if (filters.endpoint) {
      sql += ` AND endpoint = $${idx++}`;
      params.push(filters.endpoint);
    }
    sql += ` ORDER BY created_at DESC`;
    if (filters.limit) {
      sql += ` LIMIT $${idx++}`;
      params.push(filters.limit);
    } else {
      sql += ` LIMIT 100`;
    }
    if (filters.offset) {
      sql += ` OFFSET $${idx++}`;
      params.push(filters.offset);
    }
    const result = await db.query(sql, params);
    return result.rows;
  }

  static async checkSystemAlerts() {
    const alerts = [];

    const errorRate = await db.query(
      `WITH total AS (
        SELECT COUNT(*)::int AS count FROM system_logs
        WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour'
      ),
      errors AS (
        SELECT COUNT(*)::int AS count FROM system_logs
        WHERE level IN ('error', 'critical') AND created_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour'
      )
      SELECT total.count AS total, errors.count AS errors,
        CASE WHEN total.count > 0 THEN ROUND((errors.count::numeric / total.count) * 100, 2) ELSE 0 END AS rate
      FROM total, errors`
    );

    if (errorRate.rows[0].total > 0) {
      const rate = parseFloat(errorRate.rows[0].rate);
      if (rate > 5) {
        alerts.push({
          type: 'error_rate_spike',
          severity: 'critical',
          message: `Error rate spike: ${rate}% error rate in the last hour (${errorRate.rows[0].errors} of ${errorRate.rows[0].total} requests).`,
        });
      }
    }

    const slowResponse = await db.query(
      `SELECT COALESCE(AVG(response_time), 0)::int AS avg_ms
       FROM system_logs
       WHERE level = 'info' AND response_time IS NOT NULL
         AND created_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour'`
    );

    if (slowResponse.rows[0].avg_ms > 5000) {
      alerts.push({
        type: 'slow_response_time',
        severity: 'warning',
        message: `High average response time: ${slowResponse.rows[0].avg_ms}ms in the last hour.`,
      });
    }

    const failedLogins = await db.query(
      `SELECT COUNT(*)::int AS count
       FROM authentication_logs
       WHERE action = 'LOGIN' AND status = 'FAILED'
         AND created_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour'`
    );

    if (failedLogins.rows[0].count > 20) {
      alerts.push({
        type: 'failed_login_spike',
        severity: 'warning',
        message: `Spike in failed login attempts: ${failedLogins.rows[0].count} failed logins in the last hour.`,
      });
    }

    const dbOk = await db.query(`SELECT 1 AS ok`).catch(() => null);
    if (!dbOk) {
      alerts.push({
        type: 'database_connection',
        severity: 'critical',
        message: 'Database connection issue detected.',
      });
    }

    return alerts;
  }
}

module.exports = SystemMonitor;
