const { query } = require('../config/db');
const logger = require('../utils/logger');

const SENSITIVE_TABLES = [
  'employee_profiles', 'users', 'roles', 'payroll_records',
  'expenses', 'budgets', 'tax_records', 'bank_accounts',
  'procurement_requests', 'purchase_orders',
];

async function logAuditEvent(userId, tableName, operation, recordId, oldValues, newValues, ipAddress, queryText) {
  try {
    const isSensitive = SENSITIVE_TABLES.includes(tableName);
    await query(
      `INSERT INTO db_activities (user_id, table_name, operation, record_id, old_values, new_values, query_text, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [userId, tableName, operation, recordId,
       oldValues ? JSON.stringify(oldValues) : null,
       newValues ? JSON.stringify(newValues) : null,
       isSensitive ? queryText : null,
       ipAddress]
    );
  } catch (e) {
    logger.error('Audit log failed', { error: e.message });
  }
}

async function getAuditLogs(filters = {}) {
  let sql = 'SELECT da.*, u.email as user_email FROM db_activities da LEFT JOIN users u ON da.user_id = u.id WHERE 1=1';
  const params = [];
  let paramIndex = 1;

  if (filters.tableName) { sql += ` AND da.table_name = $${paramIndex++}`; params.push(filters.tableName); }
  if (filters.operation) { sql += ` AND da.operation = $${paramIndex++}`; params.push(filters.operation); }
  if (filters.userId) { sql += ` AND da.user_id = $${paramIndex++}`; params.push(filters.userId); }
  if (filters.startDate) { sql += ` AND da.created_at >= $${paramIndex++}`; params.push(filters.startDate); }
  if (filters.endDate) { sql += ` AND da.created_at <= $${paramIndex++}`; params.push(filters.endDate); }
  if (filters.search) {
    sql += ` AND (da.table_name ILIKE $${paramIndex} OR da.operation ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  sql += ' ORDER BY da.created_at DESC';
  const limit = filters.limit || 100;
  const offset = filters.offset || 0;
  sql += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
  params.push(limit, offset);

  const result = await query(sql, params);

  const countResult = await query(
    'SELECT COUNT(*)::int AS total FROM db_activities da LEFT JOIN users u ON da.user_id = u.id WHERE 1=1',
    []
  );

  return { data: result.rows, total: countResult.rows[0].total, limit, offset };
}

async function getAuditSummary(days = 7) {
  const result = await query(
    `SELECT table_name, operation, COUNT(*)::int AS count,
     MIN(created_at) AS first_seen, MAX(created_at) AS last_seen
     FROM db_activities WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '${days} days'
     GROUP BY table_name, operation ORDER BY count DESC`
  );
  return result.rows;
}

async function getAuditStats() {
  const [totalEntries, totalUsers, recentEntries, topTables] = await Promise.all([
    query('SELECT COUNT(*)::int AS count FROM db_activities'),
    query('SELECT COUNT(DISTINCT user_id)::int AS count FROM db_activities WHERE user_id IS NOT NULL'),
    query("SELECT COUNT(*)::int AS count FROM db_activities WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'"),
    query(`SELECT table_name, COUNT(*)::int AS count FROM db_activities
           WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
           GROUP BY table_name ORDER BY count DESC LIMIT 10`),
  ]);
  return {
    totalEntries: totalEntries.rows[0].count,
    uniqueUsers: totalUsers.rows[0].count,
    last24h: recentEntries.rows[0].count,
    topTables: topTables.rows,
  };
}

module.exports = { logAuditEvent, getAuditLogs, getAuditSummary, getAuditStats };
