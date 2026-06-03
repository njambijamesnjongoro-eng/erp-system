const db = require('../config/db');

class PolicyEngine {
  static async createPolicy(data) {
    try {
      const result = await db.query(
        `INSERT INTO policies (company_id, title, description, category, content, status, version, created_by, effective_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [
          data.company_id,
          data.title,
          data.description || null,
          data.category || 'general',
          data.content || null,
          data.status || 'draft',
          1,
          data.created_by,
          data.effective_date || null,
        ]
      );
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getPolicies(companyId, filters = {}) {
    try {
      let sql = `SELECT * FROM policies WHERE company_id = $1`;
      const params = [companyId];
      let paramIndex = 2;

      if (filters.category) {
        sql += ` AND category = $${paramIndex++}`;
        params.push(filters.category);
      }
      if (filters.status) {
        sql += ` AND status = $${paramIndex++}`;
        params.push(filters.status);
      }
      if (filters.search) {
        sql += ` AND (title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
        params.push(`%${filters.search}%`);
        paramIndex++;
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

  static async getPolicyById(id) {
    try {
      const result = await db.query(
        `SELECT * FROM policies WHERE id = $1`,
        [id]
      );
      if (result.rows.length === 0) return { success: false, error: 'Policy not found' };
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async updatePolicy(id, data) {
    try {
      const fields = [];
      const params = [];
      let paramIndex = 1;

      if (data.title !== undefined) { fields.push(`title = $${paramIndex++}`); params.push(data.title); }
      if (data.description !== undefined) { fields.push(`description = $${paramIndex++}`); params.push(data.description); }
      if (data.category !== undefined) { fields.push(`category = $${paramIndex++}`); params.push(data.category); }
      if (data.content !== undefined) { fields.push(`content = $${paramIndex++}`); params.push(data.content); }
      if (data.status !== undefined) { fields.push(`status = $${paramIndex++}`); params.push(data.status); }
      if (data.effective_date !== undefined) { fields.push(`effective_date = $${paramIndex++}`); params.push(data.effective_date); }

      if (fields.length === 0) return { success: false, error: 'No fields to update' };

      fields.push(`version = version + 1`);
      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      params.push(id);

      const result = await db.query(
        `UPDATE policies SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        params
      );
      if (result.rows.length === 0) return { success: false, error: 'Policy not found' };
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async publishPolicy(id) {
    try {
      const result = await db.query(
        `UPDATE policies SET status = 'published', effective_date = COALESCE(effective_date, CURRENT_DATE), version = version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
        [id]
      );
      if (result.rows.length === 0) return { success: false, error: 'Policy not found' };
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async deletePolicy(id) {
    try {
      const result = await db.query(
        `DELETE FROM policies WHERE id = $1 RETURNING id`,
        [id]
      );
      if (result.rows.length === 0) return { success: false, error: 'Policy not found' };
      return { success: true, data: { deleted: true } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async acknowledgePolicy(policyId, employeeId) {
    try {
      const result = await db.query(
        `INSERT INTO policy_acknowledgements (policy_id, employee_id, acknowledged_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (policy_id, employee_id)
         DO UPDATE SET acknowledged_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [policyId, employeeId]
      );
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getPolicyAcknowledgements(policyId) {
    try {
      const result = await db.query(
        `SELECT pa.*, ep.full_name AS employee_name, ep.email AS employee_email
         FROM policy_acknowledgements pa
         LEFT JOIN employee_profiles ep ON pa.employee_id = ep.id
         WHERE pa.policy_id = $1
         ORDER BY pa.acknowledged_at DESC`,
        [policyId]
      );
      return { success: true, data: result.rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getEmployeeAcknowledgements(employeeId) {
    try {
      const result = await db.query(
        `SELECT p.*, pa.acknowledged_at
         FROM policies p
         INNER JOIN policy_acknowledgements pa ON p.id = pa.policy_id
         WHERE pa.employee_id = $1
         ORDER BY pa.acknowledged_at DESC`,
        [employeeId]
      );
      return { success: true, data: result.rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getPolicyStats(companyId) {
    try {
      const byCategory = await db.query(
        `SELECT category, COUNT(*)::int AS count FROM policies WHERE company_id = $1 GROUP BY category ORDER BY category`,
        [companyId]
      );
      const byStatus = await db.query(
        `SELECT status, COUNT(*)::int AS count FROM policies WHERE company_id = $1 GROUP BY status ORDER BY status`,
        [companyId]
      );
      const ackRate = await db.query(
        `SELECT p.id, p.title,
                COUNT(pa.employee_id)::int AS acknowledgements
         FROM policies p
         LEFT JOIN policy_acknowledgements pa ON p.id = pa.policy_id
         WHERE p.company_id = $1
         GROUP BY p.id, p.title
         ORDER BY acknowledgements DESC`,
        [companyId]
      );

      return { success: true, data: { by_category: byCategory.rows, by_status: byStatus.rows, acknowledgement_rates: ackRate.rows } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = PolicyEngine;
