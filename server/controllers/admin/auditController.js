const db = require('../../config/db');
const auditService = require('../../services/auditService');

exports.getAuditLogs = async (req, res) => {
  try {
    const { user_id, action, entity_type, date_from, date_to, page = 1, limit = 20 } = req.query;
    const filters = { limit: parseInt(limit), offset: (parseInt(page) - 1) * parseInt(limit) };
    if (user_id) filters.user_id = user_id;
    if (action) filters.action = action;
    if (entity_type) filters.entity_type = entity_type;
    if (date_from) filters.date_from = date_from;
    if (date_to) filters.date_to = date_to;
    const logs = await auditService.getAuditLogs(filters);
    const countParams = [];
    const countConditions = [];
    if (user_id) { countConditions.push(`user_id = $${countParams.length + 1}`); countParams.push(user_id); }
    if (action) { countConditions.push(`action = $${countParams.length + 1}`); countParams.push(action); }
    if (entity_type) { countConditions.push(`entity_type = $${countParams.length + 1}`); countParams.push(entity_type); }
    if (date_from) { countConditions.push(`created_at >= $${countParams.length + 1}`); countParams.push(date_from); }
    if (date_to) { countConditions.push(`created_at <= $${countParams.length + 1}`); countParams.push(date_to); }
    const where = countConditions.length > 0 ? ` WHERE ` + countConditions.join(' AND ') : '';
    const countResult = await db.query(`SELECT COUNT(*)::int AS total FROM audit_logs_immutable${where}`, countParams);
    res.json({ success: true, data: logs, total: countResult.rows[0].total, page: parseInt(page), limit: parseInt(limit) });
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
    const result = await db.query(
      `SELECT
        COUNT(*)::int AS total_entries,
        (SELECT COUNT(*)::int FROM audit_logs_immutable WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours') AS last_24h,
        (SELECT json_object_agg(action, cnt) FROM (SELECT action, COUNT(*)::int AS cnt FROM audit_logs_immutable GROUP BY action) sub) AS by_action,
        (SELECT json_object_agg(entity_type, cnt) FROM (SELECT entity_type, COUNT(*)::int AS cnt FROM audit_logs_immutable GROUP BY entity_type) sub) AS by_entity,
        (SELECT COUNT(*)::int FROM audit_logs_immutable WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') AS last_30_days`
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
