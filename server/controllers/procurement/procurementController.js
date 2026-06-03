const db = require('../../config/db');
const ProcurementWorkflowEngine = require('../../services/procurementWorkflowEngine');
const InventoryEngine = require('../../services/inventoryEngine');

const buildListQuery = (filters) => {
  let conditions = [];
  let params = [];
  let idx = 1;

  if (filters.status) {
    conditions.push(`pr.status = $${idx++}`);
    params.push(filters.status);
  }
  if (filters.department_id) {
    conditions.push(`pr.department_id = $${idx++}`);
    params.push(filters.department_id);
  }
  if (filters.category_id) {
    conditions.push(`pr.category_id = $${idx++}`);
    params.push(filters.category_id);
  }
  if (filters.requester_id) {
    conditions.push(`pr.requester_id = $${idx++}`);
    params.push(filters.requester_id);
  }
  if (filters.search) {
    conditions.push(`(pr.title ILIKE $${idx} OR pr.request_number ILIKE $${idx})`);
    params.push(`%${filters.search}%`);
    idx++;
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return { whereClause, params };
};

exports.list = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { whereClause, params } = buildListQuery(req.query);

    const countResult = await db.query(
      `SELECT COUNT(*) OVER() as total, pr.*, 
       ep.full_name as requester_name, ep.employee_id as requester_code,
       d.name as department_name, pc.category_name
       FROM procurement_requests pr
       JOIN employee_profiles ep ON pr.requester_id = ep.id
       JOIN departments d ON pr.department_id = d.id
       JOIN procurement_categories pc ON pr.category_id = pc.id
       ${whereClause}
       ORDER BY pr.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    const total = countResult.rows.length > 0 ? parseInt(countResult.rows[0].total) : 0;

    res.json({ success: true, data: countResult.rows, total, page, limit });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const requestResult = await db.query(
      `SELECT pr.*, ep.full_name as requester_name, ep.employee_id as requester_code,
       d.name as department_name, pc.category_name
       FROM procurement_requests pr
       JOIN employee_profiles ep ON pr.requester_id = ep.id
       LEFT JOIN departments d ON pr.department_id = d.id
       LEFT JOIN procurement_categories pc ON pr.category_id = pc.id
       WHERE pr.id = $1`,
      [id]
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Procurement request not found' });
    }

    const itemsResult = await db.query(
      `SELECT * FROM procurement_request_items WHERE request_id = $1 ORDER BY id`,
      [id]
    );

    const approvalsResult = await db.query(
      `SELECT pa.*, ep.full_name as approver_name
       FROM procurement_approvals pa
       LEFT JOIN employee_profiles ep ON pa.approver_id = ep.id
       WHERE pa.request_id = $1
       ORDER BY pa.created_at`,
      [id]
    );

    const attachmentsResult = await db.query(
      `SELECT * FROM procurement_attachments WHERE request_id = $1 ORDER BY created_at`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...requestResult.rows[0],
        items: itemsResult.rows,
        approvals: approvalsResult.rows,
        attachments: attachmentsResult.rows
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { title, description, department_id, category_id, urgency, items, notes } = req.body;

    const requestNumber = await ProcurementWorkflowEngine.generateRequestNumber();

    const result = await db.query(
      `INSERT INTO procurement_requests (request_number, title, description, department_id, category_id, requester_id, urgency, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft')
       RETURNING *`,
      [requestNumber, title, description, department_id, category_id, req.user.employeeId, urgency, notes]
    );

    const request = result.rows[0];

    if (items && items.length > 0) {
      const itemValues = items.map((item, i) => {
        const offset = i * 7;
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`;
      }).join(', ');

      const itemParams = items.flatMap(item => [
        request.id, item.item_name, item.description, item.quantity,
        item.unit_of_measure, item.estimated_unit_cost, item.estimated_total_cost
      ]);

      await db.query(
        `INSERT INTO procurement_request_items (request_id, item_name, description, quantity, unit_of_measure, estimated_unit_cost, estimated_total_cost)
         VALUES ${itemValues}`,
        itemParams
      );
    }

    await db.query(
      `INSERT INTO procurement_audit_log (entity_type, entity_id, action, changed_by, notes)
       VALUES ('procurement_request', $1, 'created', $2, $3)`,
      [request.id, req.user.employeeId, JSON.stringify({ title, department_id, category_id, urgency })]
    );

    res.status(201).json({ success: true, data: request });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category_id, urgency, items, notes } = req.body;

    const existing = await db.query('SELECT * FROM procurement_requests WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Procurement request not found' });
    }

    const request = existing.rows[0];
    if (request.status !== 'draft' && request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Cannot update request in current status' });
    }

    const changes = {};
    if (title !== undefined && title !== request.title) changes.title = title;
    if (description !== undefined && description !== request.description) changes.description = description;
    if (category_id !== undefined && category_id !== request.category_id) changes.category_id = category_id;
    if (urgency !== undefined && urgency !== request.urgency) changes.urgency = urgency;
    if (notes !== undefined && notes !== request.notes) changes.notes = notes;

    if (Object.keys(changes).length > 0) {
      const setClauses = Object.keys(changes).map((key, i) => `${key} = $${i + 2}`).join(', ');
      const values = Object.values(changes);

      await db.query(
        `UPDATE procurement_requests SET ${setClauses} WHERE id = $1`,
        [id, ...values]
      );

      await db.query(
        `INSERT INTO procurement_audit_log (entity_type, entity_id, action, changed_by, notes)
         VALUES ('procurement_request', $1, 'updated', $2, $3)`,
        [id, req.user.employeeId, JSON.stringify(changes)]
      );
    }

    if (items && items.length > 0) {
      await db.query('DELETE FROM procurement_request_items WHERE request_id = $1', [id]);

      const itemValues = items.map((item, i) => {
        const offset = i * 7;
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`;
      }).join(', ');

      const itemParams = items.flatMap(item => [
        id, item.item_name, item.description, item.quantity,
        item.unit_of_measure, item.estimated_unit_cost, item.estimated_total_cost
      ]);

      await db.query(
        `INSERT INTO procurement_request_items (request_id, item_name, description, quantity, unit_of_measure, estimated_unit_cost, estimated_total_cost)
         VALUES ${itemValues}`,
        itemParams
      );
    }

    const updated = await db.query('SELECT * FROM procurement_requests WHERE id = $1', [id]);
    res.json({ success: true, data: updated.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await db.query('SELECT * FROM procurement_requests WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Procurement request not found' });
    }

    if (existing.rows[0].status !== 'draft') {
      return res.status(400).json({ success: false, message: 'Only draft requests can be deleted' });
    }

    await db.query('DELETE FROM procurement_request_items WHERE request_id = $1', [id]);
    await db.query('DELETE FROM procurement_attachments WHERE request_id = $1', [id]);
    await db.query('DELETE FROM procurement_audit_log WHERE entity_id = $1 AND entity_type = $2', [id, 'procurement_request']);
    await db.query('DELETE FROM procurement_requests WHERE id = $1', [id]);

    res.json({ success: true, message: 'Procurement request deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.submit = async (req, res) => {
  try {
    const { id } = req.params;

    await ProcurementWorkflowEngine.submitRequest(id, req.user.employeeId);

    await db.query(
      `INSERT INTO procurement_audit_log (entity_type, entity_id, action, changed_by, notes)
       VALUES ('procurement_request', $1, 'submitted', $2, $3)`,
      [id, req.user.employeeId, JSON.stringify({ status: 'pending' })]
    );

    const result = await db.query('SELECT * FROM procurement_requests WHERE id = $1', [id]);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM procurement_categories WHERE is_active = true ORDER BY category_name'
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAttachments = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM procurement_attachments WHERE request_id = $1 ORDER BY created_at',
      [req.params.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.uploadAttachment = async (req, res) => {
  try {
    const { originalname, filename, mimetype, size, path } = req.file;

    const result = await db.query(
      `INSERT INTO procurement_attachments (request_id, file_name, file_path, mime_type, file_size, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.params.id, originalname, path || filename, mimetype, size, req.user.employeeId]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
