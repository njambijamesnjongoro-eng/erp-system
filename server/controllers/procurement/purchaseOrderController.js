const db = require('../../config/db');
const ProcurementWorkflowEngine = require('../../services/procurementWorkflowEngine');
const InventoryEngine = require('../../services/inventoryEngine');

exports.list = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    let conditions = [];
    let params = [];
    let idx = 1;

    if (req.query.status) {
      conditions.push(`po.status = $${idx++}`);
      params.push(req.query.status);
    }
    if (req.query.supplier_id) {
      conditions.push(`po.supplier_id = $${idx++}`);
      params.push(req.query.supplier_id);
    }
    if (req.query.request_id) {
      conditions.push(`po.request_id = $${idx++}`);
      params.push(req.query.request_id);
    }
    if (req.query.date_from) {
      conditions.push(`po.order_date >= $${idx++}`);
      params.push(req.query.date_from);
    }
    if (req.query.date_to) {
      conditions.push(`po.order_date <= $${idx++}`);
      params.push(req.query.date_to);
    }
    if (req.query.search) {
      conditions.push(`po.po_number ILIKE $${idx}`);
      params.push(`%${req.query.search}%`);
      idx++;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await db.query(
      `SELECT po.*, ps.supplier_name, ps.supplier_code,
       ep.full_name as created_by_name,
       COUNT(*) OVER() as total
       FROM purchase_orders po
       JOIN procurement_suppliers ps ON po.supplier_id = ps.id
       JOIN employee_profiles ep ON po.created_by = ep.id
       ${whereClause}
       ORDER BY po.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );

    const total = result.rows.length > 0 ? parseInt(result.rows[0].total) : 0;

    res.json({ success: true, data: result.rows, total, page, limit });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const poResult = await db.query(
      `SELECT po.*, ps.supplier_name, ps.supplier_code, ps.email as supplier_email, ps.phone as supplier_phone,
       ep.full_name as created_by_name, pr.request_number
       FROM purchase_orders po
       JOIN procurement_suppliers ps ON po.supplier_id = ps.id
       JOIN employee_profiles ep ON po.created_by = ep.id
       LEFT JOIN procurement_requests pr ON po.request_id = pr.id
       WHERE po.id = $1`,
      [id]
    );

    if (poResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' });
    }

    const itemsResult = await db.query(
      `SELECT * FROM purchase_order_items WHERE po_id = $1 ORDER BY id`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...poResult.rows[0],
        items: itemsResult.rows
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { supplier_id, request_id, order_date, expected_delivery_date, items, notes, terms } = req.body;

    const poNumber = await InventoryEngine.generatePONumber();

    const poResult = await db.query(
      `INSERT INTO purchase_orders (po_number, supplier_id, request_id, order_date, expected_delivery_date, notes, terms, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft', $8)
       RETURNING *`,
      [poNumber, supplier_id, request_id, order_date || new Date(), expected_delivery_date, notes, terms, req.user.employeeId]
    );

    const po = poResult.rows[0];

    if (items && items.length > 0) {
      const itemValues = items.map((item, i) => {
        const offset = i * 7;
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`;
      }).join(', ');

      const itemParams = items.flatMap(item => [
        po.id, item.item_name, item.description, item.quantity,
        item.unit_cost, item.total_cost, item.unit_of_measure
      ]);

      await db.query(
        `INSERT INTO purchase_order_items (po_id, item_name, description, quantity_ordered, unit_cost, total_cost, unit_of_measure)
         VALUES ${itemValues}`,
        itemParams
      );
    }

    if (request_id) {
      await db.query(
        `UPDATE procurement_requests SET status = 'ordered' WHERE id = $1`,
        [request_id]
      );
    }

    await db.query(
      `INSERT INTO procurement_audit_log (entity_id, entity_type, action, changed_by, new_value, notes)
       VALUES ($1, 'purchase_order', $2, $3, $4, $5)`,
      [request_id || po.id, 'po_created', req.user.employeeId, JSON.stringify({ po_id: po.id, po_number: poNumber }), 'Purchase order created']
    );

    res.status(201).json({ success: true, data: po });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { supplier_id, order_date, expected_delivery_date, items, notes, terms } = req.body;

    const existing = await db.query('SELECT * FROM purchase_orders WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' });
    }

    if (existing.rows[0].status !== 'draft') {
      return res.status(400).json({ success: false, message: 'Only draft purchase orders can be updated' });
    }

    const result = await db.query(
      `UPDATE purchase_orders
       SET supplier_id = COALESCE($1, supplier_id),
           order_date = COALESCE($2, order_date),
           expected_delivery_date = COALESCE($3, expected_delivery_date),
           notes = COALESCE($4, notes),
           terms = COALESCE($5, terms),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [supplier_id, order_date, expected_delivery_date, notes, terms, id]
    );

    if (items && items.length > 0) {
      await db.query('DELETE FROM purchase_order_items WHERE po_id = $1', [id]);

      const itemValues = items.map((item, i) => {
        const offset = i * 7;
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`;
      }).join(', ');

      const itemParams = items.flatMap(item => [
        id, item.item_name, item.description, item.quantity,
        item.unit_cost, item.total_cost, item.unit_of_measure
      ]);

      await db.query(
        `INSERT INTO purchase_order_items (po_id, item_name, description, quantity_ordered, unit_cost, total_cost, unit_of_measure)
         VALUES ${itemValues}`,
        itemParams
      );
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.approve = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await db.query('SELECT * FROM purchase_orders WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' });
    }

    const result = await db.query(
      `UPDATE purchase_orders SET status = 'approved', approved_by = $1, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [req.user.employeeId, id]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.send = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await db.query('SELECT * FROM purchase_orders WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' });
    }

    const result = await db.query(
      `UPDATE purchase_orders SET status = 'sent', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.cancel = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await db.query('SELECT * FROM purchase_orders WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' });
    }

    const po = existing.rows[0];

    await db.query(
      `UPDATE purchase_orders SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );

    if (po.request_id) {
      await db.query(
        `UPDATE procurement_requests SET status = 'approved' WHERE id = $1`,
        [po.request_id]
      );
    }

    res.json({ success: true, message: 'Purchase order cancelled' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getByRequest = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT po.*, ps.supplier_name
       FROM purchase_orders po
       JOIN procurement_suppliers ps ON po.supplier_id = ps.id
       WHERE po.request_id = $1
       ORDER BY po.created_at DESC`,
      [req.params.requestId]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
