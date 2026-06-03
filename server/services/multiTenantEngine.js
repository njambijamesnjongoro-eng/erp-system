const db = require('../config/db');

class MultiTenantEngine {
  static async createCompany(data) {
    try {
      const prefix = (data.company_name || 'comp').substring(0, 3).toUpperCase();
      const countResult = await db.query(
        `SELECT COUNT(*)::int + 1 AS counter FROM companies`, []
      );
      const companyCode = `${prefix}${String(countResult.rows[0].counter).padStart(4, '0')}`;
      const result = await db.query(
        `INSERT INTO companies (company_code, company_name, legal_name, tax_id, registration_number, email, phone, website, address, city, country, logo_url, is_active, subscription_plan)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
        [companyCode, data.company_name, data.legal_name||null, data.tax_id||null, data.registration_number||null,
         data.email||null, data.phone||null, data.website||null, data.address||null, data.city||null,
         data.country||null, data.logo_url||null, data.is_active!==undefined?data.is_active:true, data.subscription_plan||'enterprise']
      );
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getCompanies(filters = {}) {
    try {
      let sql = `SELECT c.* FROM companies c WHERE 1=1`;
      const params = []; let p = 1;
      if (filters.search) {
        sql += ` AND (c.company_name ILIKE $${p} OR c.company_code ILIKE $${p})`;
        params.push(`%${filters.search}%`); p++;
      }
      if (filters.is_active !== undefined) {
        sql += ` AND c.is_active = $${p++}`; params.push(filters.is_active);
      }
      sql += ` ORDER BY c.company_name ASC LIMIT $${p++}`;
      params.push(filters.limit || 50);
      if (filters.offset) { sql += ` OFFSET $${p++}`; params.push(filters.offset); }
      const result = await db.query(sql, params);
      return { success: true, data: result.rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getCompanyById(id) {
    try {
      const company = await db.query(`SELECT c.* FROM companies c WHERE c.id = $1`, [id]);
      if (company.rows.length === 0) return { success: false, error: 'Company not found' };
      const [branchCount, userCount] = await Promise.all([
        db.query(`SELECT COUNT(*)::int AS count FROM branches WHERE company_id = $1`, [id]),
        db.query(`SELECT COUNT(*)::int AS count FROM company_users WHERE company_id = $1`, [id])
      ]);
      company.rows[0].branch_count = branchCount.rows[0].count;
      company.rows[0].user_count = userCount.rows[0].count;
      return { success: true, data: company.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async updateCompany(id, data) {
    try {
      const fields = []; const params = []; let p = 1;
      const colMap = { company_name:'company_name', legal_name:'legal_name', tax_id:'tax_id', registration_number:'registration_number', email:'email', phone:'phone', website:'website', address:'address', city:'city', country:'country', logo_url:'logo_url', is_active:'is_active', subscription_plan:'subscription_plan' };
      for (const [key, col] of Object.entries(colMap)) {
        if (data[key] !== undefined) { fields.push(`${col} = $${p++}`); params.push(data[key]); }
      }
      if (!fields.length) return { success: false, error: 'No fields to update' };
      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      params.push(id);
      const result = await db.query(`UPDATE companies SET ${fields.join(', ')} WHERE id = $${p} RETURNING *`, params);
      if (!result.rows.length) return { success: false, error: 'Company not found' };
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async toggleCompany(id, data) {
    try {
      const result = await db.query(`UPDATE companies SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`, [data.is_active, id]);
      if (!result.rows.length) return { success: false, error: 'Company not found' };
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async deleteCompany(id) {
    try {
      await db.query(`DELETE FROM branches WHERE company_id = $1`, [id]);
      await db.query(`DELETE FROM company_users WHERE company_id = $1`, [id]);
      const result = await db.query(`DELETE FROM companies WHERE id = $1 RETURNING id`, [id]);
      if (!result.rows.length) return { success: false, error: 'Company not found' };
      return { success: true, data: { deleted: true } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async createBranch(data) {
    try {
      const prefix = (data.branch_name || 'BR').substring(0, 3).toUpperCase();
      const countResult = await db.query(`SELECT COUNT(*)::int + 1 AS counter FROM branches WHERE company_id = $1`, [data.company_id]);
      const branchCode = `${prefix}${String(countResult.rows[0].counter).padStart(3, '0')}`;
      const result = await db.query(
        `INSERT INTO branches (company_id, branch_code, branch_name, branch_type, address, city, country, phone, email, manager_id, is_active, timezone)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
        [data.company_id, branchCode, data.branch_name, data.branch_type||'office', data.address||null, data.city||null,
         data.country||null, data.phone||null, data.email||null, data.manager_id||null,
         data.is_active!==undefined?data.is_active:true, data.timezone||'UTC']
      );
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getBranches(filters = {}) {
    try {
      let sql = `SELECT b.*, c.company_name FROM branches b LEFT JOIN companies c ON c.id = b.company_id WHERE 1=1`;
      const params = []; let p = 1;
      if (filters.company_id) {
        sql += ` AND b.company_id = $${p++}`; params.push(filters.company_id);
      }
      if (filters.search) {
        sql += ` AND (b.branch_name ILIKE $${p} OR b.branch_code ILIKE $${p})`;
        params.push(`%${filters.search}%`); p++;
      }
      if (filters.is_active !== undefined) { sql += ` AND b.is_active = $${p++}`; params.push(filters.is_active); }
      sql += ` ORDER BY b.branch_name ASC LIMIT $${p++}`;
      params.push(filters.limit || 50);
      if (filters.offset) { sql += ` OFFSET $${p++}`; params.push(filters.offset); }
      const result = await db.query(sql, params);
      return { success: true, data: result.rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getBranchById(id) {
    try {
      const result = await db.query(`SELECT b.* FROM branches b WHERE b.id = $1`, [id]);
      if (!result.rows.length) return { success: false, error: 'Branch not found' };
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async updateBranch(id, data) {
    try {
      const fields = []; const params = []; let p = 1;
      const colMap = { branch_name:'branch_name', branch_type:'branch_type', address:'address', city:'city', country:'country', phone:'phone', email:'email', manager_id:'manager_id', is_active:'is_active', timezone:'timezone' };
      for (const [key, col] of Object.entries(colMap)) {
        if (data[key] !== undefined) { fields.push(`${col} = $${p++}`); params.push(data[key]); }
      }
      if (!fields.length) return { success: false, error: 'No fields to update' };
      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      params.push(id);
      const result = await db.query(`UPDATE branches SET ${fields.join(', ')} WHERE id = $${p} RETURNING *`, params);
      if (!result.rows.length) return { success: false, error: 'Branch not found' };
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async deleteBranch(id) {
    try {
      const result = await db.query(`DELETE FROM branches WHERE id = $1 RETURNING id`, [id]);
      if (!result.rows.length) return { success: false, error: 'Branch not found' };
      return { success: true, data: { deleted: true } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async assignUserToCompany(data) {
    try {
      const result = await db.query(
        `INSERT INTO company_users (company_id, user_id, role_id, branch_id, is_company_admin, is_active)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [data.company_id, data.user_id, data.role_id||null, data.branch_id||null, data.is_company_admin||false, true]
      );
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getCompanyUsers(companyId) {
    try {
      const result = await db.query(
        `SELECT cu.*, u.email, ep.full_name, ep.avatar_url
         FROM company_users cu
         LEFT JOIN users u ON cu.user_id = u.id
         LEFT JOIN employee_profiles ep ON cu.user_id = ep.user_id
         WHERE cu.company_id = $1 ORDER BY cu.created_at DESC`, [companyId]
      );
      return { success: true, data: result.rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async removeUserFromCompany(id) {
    try {
      const result = await db.query(`DELETE FROM company_users WHERE id = $1 RETURNING id`, [id]);
      if (!result.rows.length) return { success: false, error: 'Company user not found' };
      return { success: true, data: { deleted: true } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getMultiCompanyStats() {
    try {
      const [total, active, inactive, users, branches] = await Promise.all([
        db.query(`SELECT COUNT(*)::int AS count FROM companies`, []),
        db.query(`SELECT COUNT(*)::int AS count FROM companies WHERE is_active = true`, []),
        db.query(`SELECT COUNT(*)::int AS count FROM companies WHERE is_active = false`, []),
        db.query(`SELECT COUNT(*)::int AS count FROM company_users`, []),
        db.query(`SELECT COUNT(*)::int AS count FROM branches`, [])
      ]);
      return { success: true, data: { total_companies: total.rows[0].count, active_companies: active.rows[0].count, inactive_companies: inactive.rows[0].count, total_users: users.rows[0].count, total_branches: branches.rows[0].count } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = MultiTenantEngine;
