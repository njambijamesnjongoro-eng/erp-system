const db = require('../config/db');

class ComplianceEngine {
  static async getFrameworks(filters = {}) {
    try {
      let sql = `SELECT * FROM compliance_frameworks WHERE 1=1`;
      const params = [];
      let paramIndex = 1;

      if (filters.company_id) {
        sql += ` AND company_id = $${paramIndex++}`;
        params.push(filters.company_id);
      }
      if (filters.search) {
        sql += ` AND (name ILIKE $${paramIndex} OR code ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
        params.push(`%${filters.search}%`);
        paramIndex++;
      }
      if (filters.category) {
        sql += ` AND category = $${paramIndex++}`;
        params.push(filters.category);
      }
      if (filters.is_active !== undefined) {
        sql += ` AND is_active = $${paramIndex++}`;
        params.push(filters.is_active);
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

  static async getFrameworkById(id) {
    try {
      const result = await db.query(
        `SELECT * FROM compliance_frameworks WHERE id = $1`,
        [id]
      );
      if (result.rows.length === 0) return { success: false, error: 'Framework not found' };

      const reqCount = await db.query(
        `SELECT COUNT(*)::int AS count FROM compliance_requirements WHERE framework_id = $1`,
        [id]
      );
      result.rows[0].requirements_count = reqCount.rows[0].count;

      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async createFramework(data) {
    try {
      const result = await db.query(
        `INSERT INTO compliance_frameworks (company_id, name, code, description, category, version, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          data.company_id,
          data.name,
          data.code,
          data.description || null,
          data.category,
          data.version || '1.0',
          data.is_active !== undefined ? data.is_active : true,
        ]
      );
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async deleteFramework(id) {
    try {
      await db.query(`DELETE FROM compliance_requirements WHERE framework_id = $1`, [id]);
      const result = await db.query(`DELETE FROM compliance_frameworks WHERE id = $1 RETURNING id`, [id]);
      if (result.rows.length === 0) return { success: false, error: 'Framework not found' };
      return { success: true, data: { deleted: true } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getRequirements(frameworkId, filters = {}) {
    try {
      let sql = `SELECT cr.*, ep.full_name AS assigned_to_name
                 FROM compliance_requirements cr
                 LEFT JOIN employee_profiles ep ON cr.assigned_to = ep.id
                 WHERE cr.framework_id = $1`;
      const params = [frameworkId];
      let paramIndex = 2;

      if (filters.status) {
        sql += ` AND cr.status = $${paramIndex++}`;
        params.push(filters.status);
      }
      if (filters.risk_level) {
        sql += ` AND cr.risk_level = $${paramIndex++}`;
        params.push(filters.risk_level);
      }
      if (filters.category) {
        sql += ` AND cr.category = $${paramIndex++}`;
        params.push(filters.category);
      }

      sql += ` ORDER BY cr.due_date ASC NULLS LAST, cr.created_at DESC`;

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
      return { success: true, data: result.rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getRequirementById(id) {
    try {
      const result = await db.query(
        `SELECT cr.*, ep.full_name AS assigned_to_name
         FROM compliance_requirements cr
         LEFT JOIN employee_profiles ep ON cr.assigned_to = ep.id
         WHERE cr.id = $1`,
        [id]
      );
      if (result.rows.length === 0) return { success: false, error: 'Requirement not found' };
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async createRequirement(data) {
    try {
      const result = await db.query(
        `INSERT INTO compliance_requirements (framework_id, requirement_code, title, description, category, risk_level, due_date, assigned_to, status, score, evidence_required)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
        [
          data.framework_id,
          data.requirement_code,
          data.title,
          data.description || null,
          data.category || null,
          data.risk_level || 'medium',
          data.due_date || null,
          data.assigned_to || null,
          data.status || 'pending',
          data.score || 0,
          data.evidence_required || false,
        ]
      );
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async updateRequirement(id, data) {
    try {
      const fields = [];
      const params = [];
      let paramIndex = 1;

      if (data.requirement_code !== undefined) { fields.push(`requirement_code = $${paramIndex++}`); params.push(data.requirement_code); }
      if (data.title !== undefined) { fields.push(`title = $${paramIndex++}`); params.push(data.title); }
      if (data.description !== undefined) { fields.push(`description = $${paramIndex++}`); params.push(data.description); }
      if (data.category !== undefined) { fields.push(`category = $${paramIndex++}`); params.push(data.category); }
      if (data.risk_level !== undefined) { fields.push(`risk_level = $${paramIndex++}`); params.push(data.risk_level); }
      if (data.due_date !== undefined) { fields.push(`due_date = $${paramIndex++}`); params.push(data.due_date); }
      if (data.assigned_to !== undefined) { fields.push(`assigned_to = $${paramIndex++}`); params.push(data.assigned_to); }
      if (data.status !== undefined) { fields.push(`status = $${paramIndex++}`); params.push(data.status); }
      if (data.score !== undefined) { fields.push(`score = $${paramIndex++}`); params.push(data.score); }
      if (data.evidence_required !== undefined) { fields.push(`evidence_required = $${paramIndex++}`); params.push(data.evidence_required); }
      if (data.evidence_url !== undefined) { fields.push(`evidence_url = $${paramIndex++}`); params.push(data.evidence_url); }
      if (data.completed_at !== undefined) { fields.push(`completed_at = $${paramIndex++}`); params.push(data.completed_at); }
      if (data.completed_by !== undefined) { fields.push(`completed_by = $${paramIndex++}`); params.push(data.completed_by); }

      if (fields.length === 0) return { success: false, error: 'No fields to update' };

      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      params.push(id);

      const result = await db.query(
        `UPDATE compliance_requirements SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        params
      );
      if (result.rows.length === 0) return { success: false, error: 'Requirement not found' };
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async deleteRequirement(id) {
    try {
      const result = await db.query(`DELETE FROM compliance_requirements WHERE id = $1 RETURNING id`, [id]);
      if (result.rows.length === 0) return { success: false, error: 'Requirement not found' };
      return { success: true, data: { deleted: true } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getAudits(companyId, filters = {}) {
    try {
      let sql = `SELECT ca.*, cf.name AS framework_name
                 FROM compliance_audits ca
                 LEFT JOIN compliance_frameworks cf ON ca.framework_id = cf.id
                 WHERE ca.company_id = $1`;
      const params = [companyId];
      let paramIndex = 2;

      if (filters.status) {
        sql += ` AND ca.status = $${paramIndex++}`;
        params.push(filters.status);
      }
      if (filters.audit_type) {
        sql += ` AND ca.audit_type = $${paramIndex++}`;
        params.push(filters.audit_type);
      }
      if (filters.framework_id) {
        sql += ` AND ca.framework_id = $${paramIndex++}`;
        params.push(filters.framework_id);
      }

      sql += ` ORDER BY ca.audit_date DESC NULLS LAST, ca.created_at DESC`;

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

  static async getAuditById(id) {
    try {
      const result = await db.query(
        `SELECT ca.*, cf.name AS framework_name
         FROM compliance_audits ca
         LEFT JOIN compliance_frameworks cf ON ca.framework_id = cf.id
         WHERE ca.id = $1`,
        [id]
      );
      if (result.rows.length === 0) return { success: false, error: 'Audit not found' };
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async createAudit(data) {
    try {
      const result = await db.query(
        `INSERT INTO compliance_audits (company_id, framework_id, title, audit_type, auditor_name, audit_date, score, status, findings, recommendations, remedial_actions, next_audit_date, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
        [
          data.company_id,
          data.framework_id || null,
          data.title,
          data.audit_type || 'internal',
          data.auditor_name || null,
          data.audit_date || null,
          data.score || null,
          data.status || 'scheduled',
          data.findings || null,
          data.recommendations || null,
          data.remedial_actions || null,
          data.next_audit_date || null,
          data.created_by || null,
        ]
      );
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async updateAudit(id, data) {
    try {
      const fields = [];
      const params = [];
      let paramIndex = 1;

      if (data.title !== undefined) { fields.push(`title = $${paramIndex++}`); params.push(data.title); }
      if (data.audit_type !== undefined) { fields.push(`audit_type = $${paramIndex++}`); params.push(data.audit_type); }
      if (data.auditor_name !== undefined) { fields.push(`auditor_name = $${paramIndex++}`); params.push(data.auditor_name); }
      if (data.audit_date !== undefined) { fields.push(`audit_date = $${paramIndex++}`); params.push(data.audit_date); }
      if (data.score !== undefined) { fields.push(`score = $${paramIndex++}`); params.push(data.score); }
      if (data.status !== undefined) { fields.push(`status = $${paramIndex++}`); params.push(data.status); }
      if (data.findings !== undefined) { fields.push(`findings = $${paramIndex++}`); params.push(data.findings); }
      if (data.recommendations !== undefined) { fields.push(`recommendations = $${paramIndex++}`); params.push(data.recommendations); }
      if (data.remedial_actions !== undefined) { fields.push(`remedial_actions = $${paramIndex++}`); params.push(data.remedial_actions); }
      if (data.next_audit_date !== undefined) { fields.push(`next_audit_date = $${paramIndex++}`); params.push(data.next_audit_date); }

      if (fields.length === 0) return { success: false, error: 'No fields to update' };

      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      params.push(id);

      const result = await db.query(
        `UPDATE compliance_audits SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        params
      );
      if (result.rows.length === 0) return { success: false, error: 'Audit not found' };
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async deleteAudit(id) {
    try {
      const result = await db.query(`DELETE FROM compliance_audits WHERE id = $1 RETURNING id`, [id]);
      if (result.rows.length === 0) return { success: false, error: 'Audit not found' };
      return { success: true, data: { deleted: true } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getComplianceStats(companyId) {
    try {
      const totalReq = await db.query(
        `SELECT COUNT(*)::int AS count FROM compliance_requirements cr
         JOIN compliance_frameworks cf ON cr.framework_id = cf.id
         WHERE cf.company_id = $1`,
        [companyId]
      );

      const byStatus = await db.query(
        `SELECT cr.status, COUNT(*)::int AS count FROM compliance_requirements cr
         JOIN compliance_frameworks cf ON cr.framework_id = cf.id
         WHERE cf.company_id = $1 GROUP BY cr.status`,
        [companyId]
      );

      const avgScore = await db.query(
        `SELECT COALESCE(AVG(cr.score), 0)::float AS avg_score FROM compliance_requirements cr
         JOIN compliance_frameworks cf ON cr.framework_id = cf.id
         WHERE cf.company_id = $1 AND cr.score IS NOT NULL`,
        [companyId]
      );

      const overdue = await db.query(
        `SELECT COUNT(*)::int AS count FROM compliance_requirements cr
         JOIN compliance_frameworks cf ON cr.framework_id = cf.id
         WHERE cf.company_id = $1 AND cr.due_date < CURRENT_DATE AND cr.status != 'compliant'`,
        [companyId]
      );

      const auditCount = await db.query(
        `SELECT COUNT(*)::int AS count FROM compliance_audits WHERE company_id = $1`,
        [companyId]
      );

      return {
        success: true,
        data: {
          total_requirements: totalReq.rows[0].count,
          by_status: byStatus.rows,
          average_score: Math.round(avgScore.rows[0].avg_score * 100) / 100,
          overdue_count: overdue.rows[0].count,
          audit_count: auditCount.rows[0].count,
        },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getComplianceDashboard(companyId) {
    try {
      const overallScore = await db.query(
        `SELECT COALESCE(AVG(cr.score), 0)::float AS score FROM compliance_requirements cr
         JOIN compliance_frameworks cf ON cr.framework_id = cf.id
         WHERE cf.company_id = $1 AND cr.score IS NOT NULL`,
        [companyId]
      );

      const frameworkBreakdown = await db.query(
        `SELECT cf.id, cf.name, COUNT(cr.id)::int AS total,
                COUNT(CASE WHEN cr.status = 'compliant' THEN 1 END)::int AS compliant,
                COALESCE(AVG(cr.score), 0)::float AS avg_score
         FROM compliance_frameworks cf
         LEFT JOIN compliance_requirements cr ON cr.framework_id = cf.id
         WHERE cf.company_id = $1
         GROUP BY cf.id, cf.name`,
        [companyId]
      );

      const recentAudits = await db.query(
        `SELECT ca.*, cf.name AS framework_name
         FROM compliance_audits ca
         LEFT JOIN compliance_frameworks cf ON ca.framework_id = cf.id
         WHERE ca.company_id = $1
         ORDER BY ca.audit_date DESC NULLS LAST
         LIMIT 10`,
        [companyId]
      );

      const upcomingDeadlines = await db.query(
        `SELECT cr.*, cf.name AS framework_name, ep.full_name AS assigned_to_name
         FROM compliance_requirements cr
         JOIN compliance_frameworks cf ON cr.framework_id = cf.id
         LEFT JOIN employee_profiles ep ON cr.assigned_to = ep.id
         WHERE cf.company_id = $1 AND cr.due_date >= CURRENT_DATE AND cr.status != 'compliant'
         ORDER BY cr.due_date ASC
         LIMIT 10`,
        [companyId]
      );

      return {
        success: true,
        data: {
          overall_score: Math.round(overallScore.rows[0].score * 100) / 100,
          framework_breakdown: frameworkBreakdown.rows,
          recent_audits: recentAudits.rows,
          upcoming_deadlines: upcomingDeadlines.rows,
        },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = ComplianceEngine;
