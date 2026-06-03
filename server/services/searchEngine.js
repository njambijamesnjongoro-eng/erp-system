const db = require('../config/db');

class SearchEngine {
  static async indexEntity(data) {
    try {
      const result = await db.query(
        `INSERT INTO enterprise_search_index (entity_type, entity_id, company_id, search_vector, metadata, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (entity_type, entity_id)
         DO UPDATE SET search_vector = EXCLUDED.search_vector,
                       metadata = EXCLUDED.metadata,
                       is_active = true,
                       updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [data.entity_type, data.entity_id, data.company_id, data.search_vector, data.metadata || null]
      );
      return { success: true, data: result.rows[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async search(companyId, query, filters = {}) {
    try {
      let sql = `SELECT * FROM enterprise_search_index WHERE company_id = $1 AND is_active = true AND search_vector ILIKE $2`;
      const params = [companyId, `%${query}%`];
      let paramIndex = 3;

      if (filters.entity_type) {
        sql += ` AND entity_type = $${paramIndex++}`;
        params.push(filters.entity_type);
      }

      sql += ` ORDER BY updated_at DESC`;

      const limit = filters.limit || 20;
      const offset = filters.offset || 0;
      sql += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      params.push(limit, offset);

      const result = await db.query(sql, params);
      return { success: true, data: result.rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async removeFromIndex(entityType, entityId) {
    try {
      const result = await db.query(
        `UPDATE enterprise_search_index SET is_active = false, updated_at = CURRENT_TIMESTAMP
         WHERE entity_type = $1 AND entity_id = $2 RETURNING *`,
        [entityType, entityId]
      );
      return { success: true, data: result.rows[0] || { updated: false } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async reindexModule(companyId, entityType) {
    try {
      const queries = {
        employee: `SELECT id AS entity_id, $1::uuid AS company_id,
                          full_name || ' ' || COALESCE(email, '') || ' ' || COALESCE(job_title, '') || ' ' || COALESCE(department, '') AS search_vector,
                          jsonb_build_object('full_name', full_name, 'email', email, 'job_title', job_title, 'department', department) AS metadata
                   FROM employee_profiles WHERE company_id = $1 AND is_active = true`,
        asset: `SELECT id AS entity_id, $1::uuid AS company_id,
                       asset_name || ' ' || COALESCE(asset_tag, '') || ' ' || COALESCE(serial_number, '') || ' ' || COALESCE(category, '') AS search_vector,
                       jsonb_build_object('asset_name', asset_name, 'asset_tag', asset_tag, 'serial_number', serial_number, 'category', category) AS metadata
                FROM assets WHERE company_id = $1 AND is_active = true`,
        procurement: `SELECT id AS entity_id, $1::uuid AS company_id,
                             order_number || ' ' || COALESCE(description, '') || ' ' || COALESCE(supplier_name, '') AS search_vector,
                             jsonb_build_object('order_number', order_number, 'description', description, 'supplier_name', supplier_name, 'status', status) AS metadata
                      FROM procurement_orders WHERE company_id = $1 AND status NOT IN ('cancelled')`,
      };

      const sql = queries[entityType];
      if (!sql) return { success: false, error: `Unknown entity type: ${entityType}` };

      const rows = await db.query(sql, [companyId]);
      if (rows.rows.length === 0) return { success: true, data: { reindexed: 0 } };

      let reindexed = 0;
      for (const row of rows.rows) {
        await db.query(
          `INSERT INTO enterprise_search_index (entity_type, entity_id, company_id, search_vector, metadata, is_active, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           ON CONFLICT (entity_type, entity_id)
           DO UPDATE SET search_vector = EXCLUDED.search_vector,
                         metadata = EXCLUDED.metadata,
                         is_active = true,
                         updated_at = CURRENT_TIMESTAMP`,
          [entityType, row.entity_id, companyId, row.search_vector, row.metadata]
        );
        reindexed++;
      }

      return { success: true, data: { reindexed } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = SearchEngine;
