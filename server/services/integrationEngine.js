const db = require('../config/db');

class IntegrationEngine {
  static async createIntegration(data) {
    try {
      const result = await db.query(
        `INSERT INTO integrations (provider, name, config, is_active, created_by)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [
          data.provider,
          data.name,
          JSON.stringify(data.config || {}),
          data.is_active !== undefined ? data.is_active : true,
          data.created_by || null,
        ]
      );
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getIntegrations(provider = null) {
    try {
      let sql = `SELECT * FROM integrations`;
      const params = [];
      if (provider) {
        sql += ` WHERE provider = $1`;
        params.push(provider);
      }
      sql += ` ORDER BY name ASC`;
      const result = await db.query(sql, params);
      return { success: true, data: result.rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getIntegrationById(id) {
    try {
      const result = await db.query(`SELECT * FROM integrations WHERE id = $1`, [id]);
      if (result.rows.length === 0) return { success: false, error: 'Integration not found' };
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async updateIntegration(id, data) {
    try {
      const updates = [];
      const params = [];
      let paramIndex = 1;

      const allowedFields = ['provider', 'name', 'config', 'is_active', 'created_by'];
      for (const field of allowedFields) {
        if (data[field] !== undefined) {
          updates.push(`${field} = $${paramIndex++}`);
          params.push(field === 'config' ? JSON.stringify(data[field]) : data[field]);
        }
      }
      if (updates.length === 0) return { success: false, error: 'No fields to update' };

      params.push(id);
      const sql = `UPDATE integrations SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex} RETURNING *`;
      const result = await db.query(sql, params);
      if (result.rows.length === 0) return { success: false, error: 'Integration not found' };
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async toggleIntegration(id, isActive) {
    try {
      const result = await db.query(
        `UPDATE integrations SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
        [isActive, id]
      );
      if (result.rows.length === 0) return { success: false, error: 'Integration not found' };
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async deleteIntegration(id) {
    try {
      const result = await db.query(`DELETE FROM integrations WHERE id = $1 RETURNING id`, [id]);
      if (result.rows.length === 0) return { success: false, error: 'Integration not found' };
      return { success: true, data: { deleted: true } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async logIntegrationAction(integrationId, action, status, data = {}) {
    try {
      const result = await db.query(
        `INSERT INTO integration_logs (integration_id, action, status, request_data, response_data, error_message)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [
          integrationId,
          action,
          status,
          data.request_data ? JSON.stringify(data.request_data) : null,
          data.response_data ? JSON.stringify(data.response_data) : null,
          data.error_message || null,
        ]
      );
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getIntegrationLogs(integrationId, filters = {}) {
    try {
      let sql = `SELECT * FROM integration_logs WHERE integration_id = $1`;
      const params = [integrationId];
      let paramIndex = 2;

      if (filters.status) {
        sql += ` AND status = $${paramIndex++}`;
        params.push(filters.status);
      }
      if (filters.action) {
        sql += ` AND action = $${paramIndex++}`;
        params.push(filters.action);
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
      return { success: true, data: result.rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getIntegrationStats() {
    try {
      const result = await db.query(
        `SELECT i.provider, i.name,
                COUNT(il.id)::int AS total_actions,
                COUNT(il.id) FILTER (WHERE il.status = 'success')::int AS success_count,
                COUNT(il.id) FILTER (WHERE il.status = 'failed')::int AS failure_count,
                COUNT(il.id) FILTER (WHERE il.status = 'error')::int AS error_count
         FROM integrations i
         LEFT JOIN integration_logs il ON i.id = il.integration_id
         GROUP BY i.id, i.provider, i.name
         ORDER BY i.name`
      );
      return { success: true, data: result.rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async createWebhook(data) {
    try {
      const result = await db.query(
        `INSERT INTO webhooks (name, url, secret, events, is_active, created_by)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [
          data.name,
          data.url,
          data.secret || null,
          data.events || [],
          data.is_active !== undefined ? data.is_active : true,
          data.created_by || null,
        ]
      );
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getWebhooks() {
    try {
      const result = await db.query(
        `SELECT * FROM webhooks WHERE is_active = true ORDER BY name ASC`
      );
      return { success: true, data: result.rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async updateWebhook(id, data) {
    try {
      const updates = [];
      const params = [];
      let paramIndex = 1;

      const allowedFields = ['name', 'url', 'secret', 'events', 'is_active'];
      for (const field of allowedFields) {
        if (data[field] !== undefined) {
          updates.push(`${field} = $${paramIndex++}`);
          params.push(field === 'events' ? JSON.stringify(data[field]) : data[field]);
        }
      }
      if (updates.length === 0) return { success: false, error: 'No fields to update' };

      params.push(id);
      const sql = `UPDATE webhooks SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex} RETURNING *`;
      const result = await db.query(sql, params);
      if (result.rows.length === 0) return { success: false, error: 'Webhook not found' };
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async deleteWebhook(id) {
    try {
      const result = await db.query(`DELETE FROM webhooks WHERE id = $1 RETURNING id`, [id]);
      if (result.rows.length === 0) return { success: false, error: 'Webhook not found' };
      return { success: true, data: { deleted: true } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async triggerWebhook(event, payload) {
    try {
      const webhooks = await db.query(
        `SELECT * FROM webhooks WHERE is_active = true AND $1 = ANY(events)`,
        [event]
      );

      const results = [];
      for (const webhook of webhooks.rows) {
        let deliveryStatus = 'success';
        let responseStatus = null;
        let responseBody = null;

        try {
          const https = require('https');
          const http = require('http');
          const urlObj = new URL(webhook.url);
          const client = urlObj.protocol === 'https:' ? https : http;

          const payloadStr = JSON.stringify({
            event,
            timestamp: new Date().toISOString(),
            data: payload,
          });

          const response = await new Promise((resolve, reject) => {
            const req = client.request(
              {
                hostname: urlObj.hostname,
                port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
                path: urlObj.pathname,
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Content-Length': Buffer.byteLength(payloadStr),
                  'X-Webhook-Secret': webhook.secret || '',
                  'X-Event': event,
                },
                timeout: 10000,
              },
              (res) => {
                let body = '';
                res.on('data', (chunk) => (body += chunk));
                res.on('end', () => resolve({ status: res.statusCode, body }));
              }
            );
            req.on('error', reject);
            req.on('timeout', () => {
              req.destroy();
              reject(new Error('Request timeout'));
            });
            req.write(payloadStr);
            req.end();
          });

          responseStatus = response.status;
          responseBody = response.body?.substring(0, 1000) || null;
          if (responseStatus < 200 || responseStatus >= 300) {
            deliveryStatus = 'failed';
          }
        } catch (err) {
          deliveryStatus = 'failed';
          responseBody = err.message;
        }

        await db.query(
          `INSERT INTO webhook_deliveries (webhook_id, event, payload, response_status, response_body, success)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [webhook.id, event, JSON.stringify(payload), responseStatus, responseBody, deliveryStatus === 'success']
        );

        results.push({
          webhook_id: webhook.id,
          webhook_name: webhook.name,
          delivery_status: deliveryStatus,
        });
      }

      return { success: true, data: results };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getWebhookDeliveries(webhookId) {
    try {
      const result = await db.query(
        `SELECT * FROM webhook_deliveries WHERE webhook_id = $1 ORDER BY created_at DESC LIMIT 100`,
        [webhookId]
      );
      return { success: true, data: result.rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = IntegrationEngine;
