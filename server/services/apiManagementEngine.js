const db = require('../config/db');
const crypto = require('crypto');

class APIManagementEngine {
  static async generateApiKey(name, userId, permissions = [], rateLimit = 100, ipRestrictions = []) {
    const rawKey = `erp_${crypto.randomBytes(32).toString('hex')}`;
    const hash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const prefix = rawKey.substring(0, 12);
    const result = await db.query(
      `INSERT INTO api_keys (name, user_id, key_hash, key_prefix, permissions, rate_limit, ip_restrictions, is_active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true, CURRENT_TIMESTAMP)
       RETURNING id, name, user_id, key_prefix, permissions, rate_limit, ip_restrictions, is_active, created_at`,
      [name, userId, hash, prefix, JSON.stringify(permissions), rateLimit, JSON.stringify(ipRestrictions)]
    );
    return { ...result.rows[0], full_key: rawKey };
  }

  static async validateApiKey(key) {
    const hash = crypto.createHash('sha256').update(key).digest('hex');
    const result = await db.query(
      `SELECT * FROM api_keys WHERE key_hash = $1 AND is_active = true AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)`,
      [hash]
    );
    if (result.rows.length === 0) return null;
    const apiKey = result.rows[0];
    await db.query(`UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1`, [apiKey.id]);
    return apiKey;
  }

  static async getApiKeys(userId = null) {
    if (userId) {
      const result = await db.query(
        `SELECT id, name, user_id, key_prefix, permissions, rate_limit, ip_restrictions, is_active, expires_at, last_used_at, created_at
         FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC`,
        [userId]
      );
      return result.rows;
    }
    const result = await db.query(
      `       SELECT ak.id, ak.name, ak.user_id, ak.key_prefix, ak.permissions, ak.rate_limit, ak.ip_restrictions, ak.is_active, ak.expires_at, ak.last_used_at, ak.created_at, COALESCE(ep.full_name, u.email) AS username
       FROM api_keys ak
       LEFT JOIN users u ON ak.user_id = u.id
       LEFT JOIN employee_profiles ep ON u.id = ep.user_id
       ORDER BY ak.created_at DESC`
    );
    return result.rows;
  }

  static async revokeApiKey(id) {
    const result = await db.query(
      `UPDATE api_keys SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id]
    );
    return result.rows[0];
  }

  static async updateApiKey(id, data) {
    const fields = [];
    const params = [];
    if (data.permissions !== undefined) { fields.push(`permissions = $${params.length + 1}`); params.push(JSON.stringify(data.permissions)); }
    if (data.rate_limit !== undefined) { fields.push(`rate_limit = $${params.length + 1}`); params.push(data.rate_limit); }
    if (data.ip_restrictions !== undefined) { fields.push(`ip_restrictions = $${params.length + 1}`); params.push(JSON.stringify(data.ip_restrictions)); }
    if (data.is_active !== undefined) { fields.push(`is_active = $${params.length + 1}`); params.push(data.is_active); }
    if (data.name !== undefined) { fields.push(`name = $${params.length + 1}`); params.push(data.name); }
    if (data.expires_at !== undefined) { fields.push(`expires_at = $${params.length + 1}`); params.push(data.expires_at); }
    if (fields.length === 0) throw new Error('No fields to update');
    params.push(id);
    const result = await db.query(
      `UPDATE api_keys SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${params.length} RETURNING id, name, user_id, key_prefix, permissions, rate_limit, ip_restrictions, is_active, expires_at, last_used_at, updated_at`,
      params
    );
    return result.rows[0];
  }

  static async logApiUsage(apiKeyId, userId, endpoint, method, statusCode, responseTime, ipAddress) {
    const result = await db.query(
      `INSERT INTO api_usage_logs (api_key_id, user_id, endpoint, method, status_code, response_time, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
       RETURNING *`,
      [apiKeyId, userId, endpoint, method, statusCode, responseTime, ipAddress]
    );
    return result.rows[0];
  }

  static async getApiUsageStats(filters = {}) {
    const params = [];
    const conditions = [];
    if (filters.date_from) {
      conditions.push(`created_at >= $${params.length + 1}`);
      params.push(filters.date_from);
    }
    if (filters.date_to) {
      conditions.push(`created_at <= $${params.length + 1}`);
      params.push(filters.date_to);
    }
    const where = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';
    const result = await db.query(
      `SELECT
        COUNT(*)::int AS total_calls,
        COUNT(DISTINCT endpoint)::int AS unique_endpoints,
        COUNT(DISTINCT api_key_id)::int AS active_keys,
        ROUND(AVG(response_time), 2) AS avg_response_time,
        ROUND(COUNT(*) FILTER (WHERE status_code >= 400)::numeric / NULLIF(COUNT(*), 0) * 100, 2) AS error_rate,
        COUNT(*) FILTER (WHERE status_code >= 500)::int AS server_errors,
        COUNT(*) FILTER (WHERE status_code >= 400 AND status_code < 500)::int AS client_errors
       FROM api_usage_logs${where}`,
      params
    );
    const endpointStats = await db.query(
      `SELECT endpoint, method, COUNT(*)::int AS call_count, ROUND(AVG(response_time), 2) AS avg_response_time
       FROM api_usage_logs${where} GROUP BY endpoint, method ORDER BY call_count DESC LIMIT 20`,
      params
    );
    return { summary: result.rows[0], by_endpoint: endpointStats.rows };
  }

  static async getApiUsageLogs(filters = {}) {
    const params = [];
    const conditions = [];
    let sql = `SELECT * FROM api_usage_logs`;
    if (filters.api_key_id) {
      conditions.push(`api_key_id = $${params.length + 1}`);
      params.push(filters.api_key_id);
    }
    if (filters.user_id) {
      conditions.push(`user_id = $${params.length + 1}`);
      params.push(filters.user_id);
    }
    if (filters.endpoint) {
      conditions.push(`endpoint = $${params.length + 1}`);
      params.push(filters.endpoint);
    }
    if (filters.method) {
      conditions.push(`method = $${params.length + 1}`);
      params.push(filters.method);
    }
    if (filters.status_code) {
      conditions.push(`status_code = $${params.length + 1}`);
      params.push(filters.status_code);
    }
    if (filters.date_from) {
      conditions.push(`created_at >= $${params.length + 1}`);
      params.push(filters.date_from);
    }
    if (filters.date_to) {
      conditions.push(`created_at <= $${params.length + 1}`);
      params.push(filters.date_to);
    }
    if (conditions.length > 0) sql += ` WHERE ` + conditions.join(' AND ');
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    const result = await db.query(sql, params);
    return result.rows;
  }
}

module.exports = APIManagementEngine;
