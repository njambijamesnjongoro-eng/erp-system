const db = require('../config/db');
const crypto = require('crypto');

class ApiGatewayEngine {
  static generateApiKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  static hashApiKey(key) {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  static async createApiKey(data) {
    try {
      const rawKey = ApiGatewayEngine.generateApiKey();
      const rawSecret = ApiGatewayEngine.generateApiKey();
      const hashedKey = ApiGatewayEngine.hashApiKey(rawKey);
      const hashedSecret = ApiGatewayEngine.hashApiKey(rawSecret);

      const result = await db.query(
        `INSERT INTO api_gateway_keys (company_id, name, api_key, api_secret, permissions, rate_limit, created_by, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, company_id, name, created_at, expires_at`,
        [data.company_id, data.name, hashedKey, hashedSecret, data.permissions || null, data.rate_limit || null, data.created_by || null, data.expires_at || null]
      );

      return {
        success: true,
        data: {
          ...result.rows[0],
          raw_api_key: rawKey,
          raw_api_secret: rawSecret,
        },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getApiKeys(companyId, filters = {}) {
    try {
      let sql = `SELECT id, company_id, name,
                        CONCAT(LEFT(api_key, 4), '****', RIGHT(api_key, 4)) AS masked_key,
                        is_active, rate_limit, expires_at, created_at, updated_at
                 FROM api_gateway_keys WHERE company_id = $1`;
      const params = [companyId];
      let paramIndex = 2;

      if (filters.is_active !== undefined) {
        sql += ` AND is_active = $${paramIndex++}`;
        params.push(filters.is_active);
      }

      sql += ` ORDER BY created_at DESC`;

      if (filters.limit) {
        sql += ` LIMIT $${paramIndex++}`;
        params.push(filters.limit);
      }
      if (filters.offset) {
        sql += ` OFFSET $${paramIndex++}`;
        params.push(filters.offset);
      }

      const result = await db.query(sql, params);
      return { success: true, data: result.rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getApiKeyById(id) {
    try {
      const result = await db.query(
        `SELECT id, company_id, name,
                CONCAT(LEFT(api_key, 4), '****', RIGHT(api_key, 4)) AS masked_key,
                is_active, rate_limit, permissions, expires_at, created_at, updated_at
         FROM api_gateway_keys WHERE id = $1`,
        [id]
      );
      if (result.rows.length === 0) return { success: false, error: 'API key not found' };
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async updateApiKey(id, data) {
    try {
      const sets = [];
      const params = [];
      let paramIndex = 1;

      if (data.name !== undefined) {
        sets.push(`name = $${paramIndex++}`);
        params.push(data.name);
      }
      if (data.permissions !== undefined) {
        sets.push(`permissions = $${paramIndex++}`);
        params.push(data.permissions);
      }
      if (data.rate_limit !== undefined) {
        sets.push(`rate_limit = $${paramIndex++}`);
        params.push(data.rate_limit);
      }
      if (data.expires_at !== undefined) {
        sets.push(`expires_at = $${paramIndex++}`);
        params.push(data.expires_at);
      }

      if (sets.length === 0) return { success: false, error: 'No fields to update' };

      sets.push(`updated_at = CURRENT_TIMESTAMP`);
      params.push(id);

      const result = await db.query(
        `UPDATE api_gateway_keys SET ${sets.join(', ')} WHERE id = $${paramIndex} RETURNING id, company_id, name, is_active, rate_limit, expires_at, updated_at`,
        params
      );
      if (result.rows.length === 0) return { success: false, error: 'API key not found' };
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async revokeApiKey(id) {
    try {
      const result = await db.query(
        `UPDATE api_gateway_keys SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, is_active`,
        [id]
      );
      if (result.rows.length === 0) return { success: false, error: 'API key not found' };
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async deleteApiKey(id) {
    try {
      const result = await db.query(`DELETE FROM api_gateway_keys WHERE id = $1 RETURNING id`, [id]);
      if (result.rows.length === 0) return { success: false, error: 'API key not found' };
      return { success: true, data: { deleted: true } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async validateApiKey(apiKey) {
    try {
      const hashedKey = ApiGatewayEngine.hashApiKey(apiKey);
      const result = await db.query(
        `SELECT agk.id, agk.company_id, agk.permissions, agk.rate_limit, c.name AS company_name, c.subdomain
         FROM api_gateway_keys agk
         JOIN companies c ON agk.company_id = c.id
         WHERE agk.api_key = $1 AND agk.is_active = true
           AND (agk.expires_at IS NULL OR agk.expires_at > CURRENT_TIMESTAMP)`,
        [hashedKey]
      );
      if (result.rows.length === 0) return { success: false, error: 'Invalid or expired API key' };
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async logApiUsage(apiKeyId, companyId, data) {
    try {
      const result = await db.query(
        `INSERT INTO api_gateway_logs (api_key_id, company_id, endpoint, method, status_code, response_time_ms, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [apiKeyId, companyId, data.endpoint, data.method || 'GET', data.status_code || 200, data.response_time_ms || null, data.ip_address || null, data.user_agent || null]
      );
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getApiUsageStats(companyId) {
    try {
      const totalCalls = await db.query(
        `SELECT COUNT(*)::int AS total FROM api_gateway_logs WHERE company_id = $1`,
        [companyId]
      );
      const byEndpoint = await db.query(
        `SELECT endpoint, COUNT(*)::int AS count FROM api_gateway_logs WHERE company_id = $1 GROUP BY endpoint ORDER BY count DESC`,
        [companyId]
      );
      const byStatus = await db.query(
        `SELECT status_code, COUNT(*)::int AS count FROM api_gateway_logs WHERE company_id = $1 GROUP BY status_code ORDER BY status_code`,
        [companyId]
      );
      const avgResponse = await db.query(
        `SELECT COALESCE(AVG(response_time_ms), 0)::float AS avg_response_time FROM api_gateway_logs WHERE company_id = $1`,
        [companyId]
      );

      return {
        success: true,
        data: {
          total_calls: totalCalls.rows[0].total,
          by_endpoint: byEndpoint.rows,
          by_status: byStatus.rows,
          avg_response_time_ms: Math.round(avgResponse.rows[0].avg_response_time * 100) / 100,
        },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getApiLogs(apiKeyId, filters = {}) {
    try {
      let sql = `SELECT * FROM api_gateway_logs WHERE api_key_id = $1`;
      const params = [apiKeyId];
      let paramIndex = 2;

      if (filters.status_code) {
        sql += ` AND status_code = $${paramIndex++}`;
        params.push(filters.status_code);
      }
      if (filters.method) {
        sql += ` AND method = $${paramIndex++}`;
        params.push(filters.method);
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

      const limit = filters.limit || 50;
      const offset = filters.offset || 0;
      sql += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      params.push(limit, offset);

      const result = await db.query(sql, params);
      return { success: true, data: result.rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async createGovernanceRule(data) {
    try {
      const result = await db.query(
        `INSERT INTO data_governance (company_id, entity_type, retention_days, legal_hold, legal_hold_reason, archive_after_days, purge_after_days, is_active, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [data.company_id, data.entity_type, data.retention_days, data.legal_hold || false, data.legal_hold_reason || null, data.archive_after_days || null, data.purge_after_days || null, data.is_active !== false, data.created_by || null]
      );
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getGovernanceRules(companyId) {
    try {
      const result = await db.query(
        `SELECT * FROM data_governance WHERE company_id = $1 ORDER BY created_at DESC`,
        [companyId]
      );
      return { success: true, data: result.rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async updateGovernanceRule(id, data) {
    try {
      const sets = [];
      const params = [];
      let paramIndex = 1;

      if (data.entity_type !== undefined) {
        sets.push(`entity_type = $${paramIndex++}`);
        params.push(data.entity_type);
      }
      if (data.retention_days !== undefined) {
        sets.push(`retention_days = $${paramIndex++}`);
        params.push(data.retention_days);
      }
      if (data.legal_hold !== undefined) {
        sets.push(`legal_hold = $${paramIndex++}`);
        params.push(data.legal_hold);
      }
      if (data.legal_hold_reason !== undefined) {
        sets.push(`legal_hold_reason = $${paramIndex++}`);
        params.push(data.legal_hold_reason);
      }
      if (data.archive_after_days !== undefined) {
        sets.push(`archive_after_days = $${paramIndex++}`);
        params.push(data.archive_after_days);
      }
      if (data.purge_after_days !== undefined) {
        sets.push(`purge_after_days = $${paramIndex++}`);
        params.push(data.purge_after_days);
      }
      if (data.is_active !== undefined) {
        sets.push(`is_active = $${paramIndex++}`);
        params.push(data.is_active);
      }

      if (sets.length === 0) return { success: false, error: 'No fields to update' };

      sets.push(`updated_at = CURRENT_TIMESTAMP`);
      params.push(id);

      const result = await db.query(
        `UPDATE data_governance SET ${sets.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        params
      );
      if (result.rows.length === 0) return { success: false, error: 'Governance rule not found' };
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async deleteGovernanceRule(id) {
    try {
      const result = await db.query(`DELETE FROM data_governance WHERE id = $1 RETURNING id`, [id]);
      if (result.rows.length === 0) return { success: false, error: 'Governance rule not found' };
      return { success: true, data: { deleted: true } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async createOrchestrationRule(data) {
    try {
      const result = await db.query(
        `INSERT INTO notification_orchestrator (company_id, name, trigger_event, priority, channels, escalation_minutes, escalation_role_id, template_id, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [
          data.company_id,
          data.name,
          data.trigger_event,
          data.priority || 'normal',
          data.channels || ['email'],
          data.escalation_minutes || null,
          data.escalation_role_id || null,
          data.template_id || null,
          data.is_active !== false,
        ]
      );
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getOrchestrationRules(companyId) {
    try {
      const result = await db.query(
        `SELECT * FROM notification_orchestrator WHERE company_id = $1 ORDER BY created_at DESC`,
        [companyId]
      );
      return { success: true, data: result.rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async updateOrchestrationRule(id, data) {
    try {
      const sets = [];
      const params = [];
      let paramIndex = 1;

      if (data.name !== undefined) {
        sets.push(`name = $${paramIndex++}`);
        params.push(data.name);
      }
      if (data.trigger_event !== undefined) {
        sets.push(`trigger_event = $${paramIndex++}`);
        params.push(data.trigger_event);
      }
      if (data.priority !== undefined) {
        sets.push(`priority = $${paramIndex++}`);
        params.push(data.priority);
      }
      if (data.channels !== undefined) {
        sets.push(`channels = $${paramIndex++}`);
        params.push(data.channels);
      }
      if (data.escalation_minutes !== undefined) {
        sets.push(`escalation_minutes = $${paramIndex++}`);
        params.push(data.escalation_minutes);
      }
      if (data.escalation_role_id !== undefined) {
        sets.push(`escalation_role_id = $${paramIndex++}`);
        params.push(data.escalation_role_id);
      }
      if (data.template_id !== undefined) {
        sets.push(`template_id = $${paramIndex++}`);
        params.push(data.template_id);
      }
      if (data.is_active !== undefined) {
        sets.push(`is_active = $${paramIndex++}`);
        params.push(data.is_active);
      }

      if (sets.length === 0) return { success: false, error: 'No fields to update' };

      sets.push(`updated_at = CURRENT_TIMESTAMP`);
      params.push(id);

      const result = await db.query(
        `UPDATE notification_orchestrator SET ${sets.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        params
      );
      if (result.rows.length === 0) return { success: false, error: 'Orchestration rule not found' };
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async deleteOrchestrationRule(id) {
    try {
      const result = await db.query(`DELETE FROM notification_orchestrator WHERE id = $1 RETURNING id`, [id]);
      if (result.rows.length === 0) return { success: false, error: 'Orchestration rule not found' };
      return { success: true, data: { deleted: true } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = ApiGatewayEngine;
