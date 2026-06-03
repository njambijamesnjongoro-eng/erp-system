const db = require('../config/db');

class EmailEngine {
  static async getTemplates(category = null) {
    let sql = `SELECT * FROM email_templates WHERE is_active = true`;
    const params = [];
    if (category) {
      sql += ` AND category = $1`;
      params.push(category);
    }
    sql += ` ORDER BY name`;
    const result = await db.query(sql, params);
    return result.rows;
  }

  static async getTemplateById(id) {
    const result = await db.query(`SELECT * FROM email_templates WHERE id = $1`, [id]);
    if (result.rows.length === 0) throw new Error('Email template not found');
    return result.rows[0];
  }

  static async getTemplateByName(name) {
    const result = await db.query(`SELECT * FROM email_templates WHERE name = $1`, [name]);
    if (result.rows.length === 0) throw new Error('Email template not found: ' + name);
    return result.rows[0];
  }

  static async createTemplate(data) {
    const result = await db.query(
      `INSERT INTO email_templates (name, subject, body, variables, category)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [data.name, data.subject, data.body, JSON.stringify(data.variables || []), data.category || null]
    );
    return result.rows[0];
  }

  static async updateTemplate(id, data) {
    const existing = await db.query(`SELECT id FROM email_templates WHERE id = $1`, [id]);
    if (existing.rows.length === 0) throw new Error('Email template not found');
    const result = await db.query(
      `UPDATE email_templates
       SET name = COALESCE($1, name),
           subject = COALESCE($2, subject),
           body = COALESCE($3, body),
           variables = COALESCE($4, variables),
           category = COALESCE($5, category),
           is_active = COALESCE($6, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 RETURNING *`,
      [
        data.name || null,
        data.subject || null,
        data.body || null,
        data.variables ? JSON.stringify(data.variables) : null,
        data.category !== undefined ? data.category : null,
        data.is_active !== undefined ? data.is_active : null,
        id,
      ]
    );
    return result.rows[0];
  }

  static async deleteTemplate(id) {
    const result = await db.query(
      `UPDATE email_templates SET is_active = false WHERE id = $1 RETURNING id`,
      [id]
    );
    if (result.rows.length === 0) throw new Error('Email template not found');
    return { deleted: true };
  }

  static async renderTemplate(template, variables) {
    let subject = template.subject;
    let body = template.body;
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      subject = subject.replace(placeholder, String(value));
      body = body.replace(placeholder, String(value));
    }
    subject = subject.replace(/\{\{\w+\}\}/g, '');
    body = body.replace(/\{\{\w+\}\}/g, '');
    return { subject, body };
  }

  static async sendEmail(toAddress, subject, body, templateId = null) {
    const result = await db.query(
      `INSERT INTO email_queue (to_address, subject, body, template_id, status)
       VALUES ($1, $2, $3, $4, 'pending') RETURNING *`,
      [toAddress, subject, body, templateId]
    );
    return result.rows[0];
  }

  static async sendTemplatedEmail(toAddress, templateName, variables) {
    const template = await this.getTemplateByName(templateName);
    const { subject, body } = await this.renderTemplate(template, variables);
    return await this.sendEmail(toAddress, subject, body, template.id);
  }

  static async sendBulkEmail(toAddresses, subject, body) {
    const results = [];
    for (const addr of toAddresses) {
      const email = await this.sendEmail(addr, subject, body);
      results.push(email);
    }
    return results;
  }

  static async processQueue(batchSize = 50) {
    const result = await db.query(
      `UPDATE email_queue
       SET status = 'sent', sent_at = CURRENT_TIMESTAMP
       WHERE id IN (
         SELECT id FROM email_queue
         WHERE status = 'pending'
         ORDER BY created_at ASC
         LIMIT $1
       )
       RETURNING COUNT(*)::int AS processed`,
      [batchSize]
    );
    return { processed: result.rows[0].processed };
  }

  static async getQueueStats() {
    const result = await db.query(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
        COUNT(*) FILTER (WHERE status = 'sent')::int AS sent,
        COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
        COUNT(*)::int AS total
       FROM email_queue`
    );
    return result.rows[0];
  }

  static async getEmailLogs(filters = {}) {
    let sql = `SELECT * FROM email_queue WHERE 1=1`;
    const params = [];
    let paramIndex = 1;

    if (filters.status) {
      sql += ` AND status = $${paramIndex++}`;
      params.push(filters.status);
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
      sql += ` LIMIT 100`;
    }
    if (filters.offset) {
      sql += ` OFFSET $${paramIndex++}`;
      params.push(filters.offset);
    }
    const result = await db.query(sql, params);
    return result.rows;
  }
}

module.exports = EmailEngine;
