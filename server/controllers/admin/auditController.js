const db = require('../../config/db');
const auditService = require('../../services/auditService');

let auditColumnCache = null;

async function getAuditColumnMap() {
  if (auditColumnCache) return auditColumnCache;
  const result = await db.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'audit_logs_immutable'`
  );
  const columns = new Set(result.rows.map((row) => row.column_name));
  const first = (names) => names.find((name) => columns.has(name)) || null;
  auditColumnCache = {
    action: first(['action', 'operation', 'event_type']),
    entityType: first(['entity_type', 'table_name', 'resource']),
    entityId: first(['entity_id', 'record_id', 'resource_id']),
    description: first(['description', 'query_text', 'details']),
    ipAddress: first(['ip_address', 'source_ip']),
  };
  return auditColumnCache;
}

const col = (name, fallback) => (name ? `ail.${name}` : fallback);

exports.getAuditLogs = async (req, res) => {
  try {
    const map = await getAuditColumnMap();
    const { user_id, user, action, entity_type, date_from, date_to, page = 1, limit = 20 } = req.query;
    const params = [];
    const conditions = [];
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const offset = (pageNum - 1) * limitNum;

    if (user_id) {
      conditions.push(`ail.user_id = $${params.length + 1}`);
      params.push(user_id);
    }
    if (user) {
      conditions.push(`u.email ILIKE $${params.length + 1}`);
      params.push(`%${user}%`);
    }
    if (action && map.action) {
      conditions.push(`ail.${map.action} = $${params.length + 1}`);
      params.push(action);
    }
    if (entity_type && map.entityType) {
      conditions.push(`ail.${map.entityType} = $${params.length + 1}`);
      params.push(entity_type);
    }
    if (date_from) {
      conditions.push(`ail.created_at >= $${params.length + 1}`);
      params.push(date_from);
    }
    if (date_to) {
      conditions.push(`ail.created_at <= $${params.length + 1}`);
      params.push(date_to);
    }

    const where = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';
    const result = await db.query(
      `SELECT ail.*,
        ${col(map.action, "'audit'")} AS action,
        ${col(map.entityType, "'system'")} AS entity_type,
        ${col(map.entityId, 'NULL::uuid')} AS entity_id,
        ${col(map.description, 'NULL::text')} AS description,
        ${col(map.ipAddress, 'NULL::text')} AS ip_address,
        u.email AS user_email,
        COALESCE(ep.full_name, u.email) AS user_name
       FROM audit_logs_immutable ail
       LEFT JOIN users u ON ail.user_id = u.id
       LEFT JOIN employee_profiles ep ON ep.user_id = u.id
       ${where}
       ORDER BY ail.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limitNum, offset]
    );
    const countResult = await db.query(
      `SELECT COUNT(*)::int AS total
       FROM audit_logs_immutable ail
       LEFT JOIN users u ON ail.user_id = u.id
       ${where}`,
      params
    );
    const total = countResult.rows[0].total;
    res.json({
      success: true,
      data: result.rows,
      total,
      page: pageNum,
      limit: limitNum,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNext: offset + result.rows.length < total,
        hasPrev: pageNum > 1,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAuditLog = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(`SELECT * FROM audit_logs_immutable WHERE id = $1`, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Audit log entry not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.verifyAuditIntegrity = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
         COUNT(*)::int AS total_entries,
         COUNT(*) FILTER (WHERE id IS NULL)::int AS invalid_entries,
         MIN(created_at) AS first_entry_at,
         MAX(created_at) AS latest_entry_at
       FROM audit_logs_immutable`
    );
    const data = {
      verified: result.rows[0].invalid_entries === 0,
      ...result.rows[0],
    };
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.exportAuditLogs = async (req, res) => {
  try {
    const { date_from, date_to, format } = req.query;
    const filters = {};
    if (date_from) filters.date_from = date_from;
    if (date_to) filters.date_to = date_to;
    filters.limit = 10000;
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
      `SELECT * FROM audit_logs_immutable${where} ORDER BY created_at DESC LIMIT 10000`,
      params
    );
    const logs = result.rows;
    if (format === 'csv') {
      const headers = 'id,user_id,action,entity_type,entity_id,description,ip_address,created_at\n';
      const rows = logs.map(l => `${l.id},${l.user_id},${l.action},${l.entity_type},${l.entity_id},"${(l.description || '').replace(/"/g, '""')}",${l.ip_address},${l.created_at}`).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=audit_logs.csv');
      return res.send(headers + rows);
    }
    res.json({ success: true, data: logs, count: logs.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAuditSummary = async (req, res) => {
  try {
    const map = await getAuditColumnMap();
    const actionExpr = `COALESCE(${col(map.action, "'audit'")}::text, 'audit')`;
    const entityExpr = `COALESCE(${col(map.entityType, "'system'")}::text, 'system')`;
    const result = await db.query(
      `SELECT
        COUNT(*)::int AS total_entries,
        COUNT(*) FILTER (WHERE LOWER(${actionExpr}) IN ('create','insert'))::int AS create_count,
        COUNT(*) FILTER (WHERE LOWER(${actionExpr}) = 'update')::int AS update_count,
        COUNT(*) FILTER (WHERE LOWER(${actionExpr}) IN ('delete','remove'))::int AS delete_count,
        (SELECT COUNT(*)::int FROM audit_logs_immutable WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours') AS last_24h,
        (SELECT json_object_agg(action, cnt) FROM (SELECT ${actionExpr} AS action, COUNT(*)::int AS cnt FROM audit_logs_immutable ail GROUP BY ${actionExpr}) sub) AS by_action,
        (SELECT json_object_agg(entity_type, cnt) FROM (SELECT ${entityExpr} AS entity_type, COUNT(*)::int AS cnt FROM audit_logs_immutable ail GROUP BY ${entityExpr}) sub) AS by_entity,
        (SELECT COUNT(*)::int FROM audit_logs_immutable WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') AS last_30_days
       FROM audit_logs_immutable ail`
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
