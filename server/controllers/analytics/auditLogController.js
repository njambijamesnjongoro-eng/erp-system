const db = require('../../config/db');

exports.getActivityFeed = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const { user_id, action, entity_type, date_from, date_to } = req.query;
    const params = [];
    let idx = 1;
    const conditions = [];

    if (user_id) {
      conditions.push(`af.user_id = $${idx++}`);
      params.push(user_id);
    }
    if (action) {
      conditions.push(`af.action = $${idx++}`);
      params.push(action);
    }
    if (entity_type) {
      conditions.push(`af.entity_type = $${idx++}`);
      params.push(entity_type);
    }
    if (date_from) {
      conditions.push(`af.created_at >= $${idx++}`);
      params.push(date_from);
    }
    if (date_to) {
      conditions.push(`af.created_at <= $${idx++}`);
      params.push(date_to);
    }

    const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const countResult = await db.query(
      `SELECT COUNT(*) OVER() AS total, af.*, u.email AS user_email
       FROM activity_feed af
       LEFT JOIN users u ON af.user_id = u.id
       ${whereClause}
       ORDER BY af.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );

    const total = countResult.rows.length > 0 ? parseInt(countResult.rows[0].total) : 0;
    res.json({ success: true, data: countResult.rows, total, page, limit });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAuditTrail = async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const result = await db.query(
      `SELECT al.*, u.email AS user_email
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE al.entity_type = $1 AND al.entity_id = $2
       ORDER BY al.created_at DESC`,
      [entityType, entityId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getSystemLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const { level, source, date_from, date_to } = req.query;
    const params = [];
    let idx = 1;
    const conditions = [];

    if (level) {
      conditions.push(`level = $${idx++}`);
      params.push(level);
    }
    if (source) {
      conditions.push(`source = $${idx++}`);
      params.push(source);
    }
    if (date_from) {
      conditions.push(`created_at >= $${idx++}`);
      params.push(date_from);
    }
    if (date_to) {
      conditions.push(`created_at <= $${idx++}`);
      params.push(date_to);
    }

    const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const countResult = await db.query(
      `SELECT COUNT(*) OVER() AS total, *
       FROM system_logs
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );

    const total = countResult.rows.length > 0 ? parseInt(countResult.rows[0].total) : 0;
    res.json({ success: true, data: countResult.rows, total, page, limit });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getComplianceRecords = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const { status, entity_type, date_from, date_to } = req.query;
    const params = [];
    let idx = 1;
    const conditions = [];

    if (status) {
      conditions.push(`cr.status = $${idx++}`);
      params.push(status);
    }
    if (entity_type) {
      conditions.push(`cr.entity_type = $${idx++}`);
      params.push(entity_type);
    }
    if (date_from) {
      conditions.push(`cr.created_at >= $${idx++}`);
      params.push(date_from);
    }
    if (date_to) {
      conditions.push(`cr.created_at <= $${idx++}`);
      params.push(date_to);
    }

    const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const countResult = await db.query(
      `SELECT COUNT(*) OVER() AS total, cr.*, d.name AS department_name
       FROM compliance_records cr
       LEFT JOIN departments d ON cr.entity_type = 'department' AND cr.entity_id::int = d.id
       ${whereClause}
       ORDER BY cr.due_date ASC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );

    const total = countResult.rows.length > 0 ? parseInt(countResult.rows[0].total) : 0;
    res.json({ success: true, data: countResult.rows, total, page, limit });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createComplianceRecord = async (req, res) => {
  try {
    const { entity_type, entity_id, status, description, due_date, notes } = req.body;
    const result = await db.query(
      `INSERT INTO compliance_records (entity_type, entity_id, status, description, due_date, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [entity_type, entity_id, status || 'pending', description, due_date || null, notes || null, req.user.id]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateComplianceRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, description, due_date, notes } = req.body;

    const existing = await db.query('SELECT id FROM compliance_records WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Compliance record not found' });
    }

    const result = await db.query(
      `UPDATE compliance_records
       SET status = COALESCE($1, status),
           description = COALESCE($2, description),
           due_date = COALESCE($3, due_date),
           notes = COALESCE($4, notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 RETURNING *`,
      [status || null, description || null, due_date || null, notes || null, id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.exportAuditLogs = async (req, res) => {
  try {
    const { date_from, date_to, entity_type, action } = req.query;
    const params = [];
    let idx = 1;
    const conditions = [];

    if (date_from) {
      conditions.push(`al.created_at >= $${idx++}`);
      params.push(date_from);
    }
    if (date_to) {
      conditions.push(`al.created_at <= $${idx++}`);
      params.push(date_to);
    }
    if (entity_type) {
      conditions.push(`al.entity_type = $${idx++}`);
      params.push(entity_type);
    }
    if (action) {
      conditions.push(`al.action = $${idx++}`);
      params.push(action);
    }

    const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const result = await db.query(
      `SELECT al.*, u.email AS user_email
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ${whereClause}
       ORDER BY al.created_at DESC`,
      params
    );

    const activityResult = await db.query(
      `SELECT af.*, u.email AS user_email
       FROM activity_feed af
       LEFT JOIN users u ON af.user_id = u.id
       ${whereClause}
       ORDER BY af.created_at DESC`,
      params
    );

    res.json({
      success: true,
      data: {
        audit_logs: result.rows,
        activity_feed: activityResult.rows,
        export_date: new Date().toISOString(),
        total_logs: result.rows.length,
        total_activities: activityResult.rows.length,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getLoginHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const { user_id, status, date_from, date_to } = req.query;
    const params = [];
    let idx = 1;
    const conditions = [];

    if (user_id) {
      conditions.push(`al.user_id = $${idx++}`);
      params.push(user_id);
    }
    if (status) {
      conditions.push(`al.status = $${idx++}`);
      params.push(status);
    }
    if (date_from) {
      conditions.push(`al.created_at >= $${idx++}`);
      params.push(date_from);
    }
    if (date_to) {
      conditions.push(`al.created_at <= $${idx++}`);
      params.push(date_to);
    }

    const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const countResult = await db.query(
      `SELECT COUNT(*) OVER() AS total, al.*, u.email AS user_email
       FROM authentication_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );

    const total = countResult.rows.length > 0 ? parseInt(countResult.rows[0].total) : 0;
    res.json({ success: true, data: countResult.rows, total, page, limit });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
