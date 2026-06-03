const db = require('../../config/db');
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
      conditions.push(`grn.status = $${idx++}`);
      params.push(req.query.status);
    }
    if (req.query.supplier_id) {
      conditions.push(`grn.supplier_id = $${idx++}`);
      params.push(req.query.supplier_id);
    }
    if (req.query.po_id) {
      conditions.push(`grn.po_id = $${idx++}`);
      params.push(req.query.po_id);
    }
    if (req.query.date_from) {
      conditions.push(`grn.created_at >= $${idx++}`);
      params.push(req.query.date_from);
    }
    if (req.query.date_to) {
      conditions.push(`grn.created_at <= $${idx++}`);
      params.push(req.query.date_to);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await db.query(
      `SELECT grn.*, ps.supplier_name, po.po_number,
       ep.full_name as created_by_name,
       COUNT(*) OVER() as total
       FROM goods_received_notes grn
       JOIN procurement_suppliers ps ON grn.supplier_id = ps.id
       JOIN purchase_orders po ON grn.po_id = po.id
       JOIN employee_profiles ep ON grn.created_by = ep.id
       ${whereClause}
       ORDER BY grn.created_at DESC
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

    const grnResult = await db.query(
      `SELECT grn.*, ps.supplier_name, ps.contact_person as supplier_contact,
       po.po_number, po.order_date, ep.full_name as created_by_name,
       rec.full_name as received_by_name
       FROM goods_received_notes grn
       JOIN procurement_suppliers ps ON grn.supplier_id = ps.id
       JOIN purchase_orders po ON grn.po_id = po.id
       JOIN employee_profiles ep ON grn.created_by = ep.id
       LEFT JOIN employee_profiles rec ON grn.received_by = rec.id
       WHERE grn.id = $1`,
      [id]
    );

    if (grnResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Goods received note not found' });
    }

    const itemsResult = await db.query(
      `SELECT gri.*, poi.item_name, poi.unit_of_measure, poi.unit_cost,
       ii.item_code
       FROM goods_received_items gri
       JOIN purchase_order_items poi ON gri.po_item_id = poi.id
       LEFT JOIN inventory_items ii ON gri.item_id = ii.id
       WHERE gri.grn_id = $1
       ORDER BY gri.id`,
      [id]
    );

    const discrepanciesResult = await db.query(
      `SELECT * FROM delivery_discrepancies WHERE grn_id = $1 ORDER BY created_at`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...grnResult.rows[0],
        items: itemsResult.rows,
        discrepancies: discrepanciesResult.rows
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { po_id, supplier_id, notes } = req.body;

    const grnNumber = await InventoryEngine.generateGRNNumber();

    const poResult = await db.query(
      `SELECT * FROM purchase_orders WHERE id = $1`,
      [po_id]
    );

    if (poResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' });
    }

    const grnResult = await db.query(
      `INSERT INTO goods_received_notes (grn_number, po_id, supplier_id, status, created_by, notes)
       VALUES ($1, $2, $3, 'pending', $4, $5)
       RETURNING *`,
      [grnNumber, po_id, supplier_id, req.user.employeeId, notes]
    );

    const grn = grnResult.rows[0];

    const poItems = await db.query(
      `SELECT * FROM purchase_order_items WHERE po_id = $1`,
      [po_id]
    );

    if (poItems.rows.length > 0) {
      const values = poItems.rows.map((item, i) => {
        const offset = i * 5;
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`;
      }).join(', ');

      const itemParams = poItems.rows.flatMap(item => [
        grn.id, item.id, item.quantity_ordered, 0, 0
      ]);

      await db.query(
        `INSERT INTO goods_received_items (grn_id, po_item_id, quantity_ordered, quantity_received, quantity_accepted)
         VALUES ${values}`,
        itemParams
      );
    }

    res.status(201).json({ success: true, data: grn });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.receive = async (req, res) => {
  try {
    const { id } = req.params;
    const { items } = req.body;

    const grnResult = await db.query('SELECT * FROM goods_received_notes WHERE id = $1', [id]);
    if (grnResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Goods received note not found' });
    }

    const grn = grnResult.rows[0];

    for (const item of items) {
      const { grn_item_id, quantity_received, quantity_accepted, quantity_rejected, rejection_reason, item_id } = item;

      await db.query(
        `UPDATE goods_received_items
         SET quantity_received = $1, quantity_accepted = $2, quantity_rejected = $3
         WHERE id = $4`,
        [quantity_received, quantity_accepted, quantity_rejected || 0, grn_item_id]
      );

      if (quantity_accepted > 0 && item_id) {
        await InventoryEngine.updateStock(item_id, quantity_accepted, 'in', null, 'GRN', id, req.user.employeeId, 'Goods received');
      }

      if (quantity_rejected > 0) {
        await db.query(
          `INSERT INTO delivery_discrepancies (grn_item_id, discrepancy_type, description, reported_by)
           VALUES ($1, 'damaged', $2, $3)`,
          [grn_item_id, (rejection_reason || 'Rejected upon receipt') + ' Qty: ' + quantity_rejected, req.user.employeeId]
        );
      }

      const griResult = await db.query(
        'SELECT po_item_id, quantity_accepted FROM goods_received_items WHERE id = $1',
        [grn_item_id]
      );

      if (griResult.rows.length > 0) {
        await db.query(
          `UPDATE purchase_order_items
           SET quantity_received = COALESCE(quantity_received, 0) + $1
           WHERE id = $2`,
          [quantity_accepted, griResult.rows[0].po_item_id]
        );
      }
    }

    const poItemsResult = await db.query(
      `SELECT poi.id, poi.quantity_ordered, poi.quantity_received
       FROM purchase_order_items poi
       JOIN goods_received_items gri ON gri.po_item_id = poi.id
       WHERE gri.grn_id = $1`,
      [id]
    );

    const allFullyReceived = poItemsResult.rows.every(
      item => parseInt(item.quantity_received) >= parseInt(item.quantity_ordered)
    );

    if (allFullyReceived) {
      await db.query(
        `UPDATE purchase_orders SET status = 'received', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [grn.po_id]
      );
    } else {
      await db.query(
        `UPDATE purchase_orders SET status = 'partially_received', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [grn.po_id]
      );
    }

    await db.query(
      `UPDATE goods_received_notes
       SET status = 'approved', received_by = $1, received_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [req.user.employeeId, id]
    );

    res.json({ success: true, message: 'Goods received successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getByPO = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT grn.*, ep.full_name as created_by_name
       FROM goods_received_notes grn
       JOIN employee_profiles ep ON grn.created_by = ep.id
       WHERE grn.po_id = $1
       ORDER BY grn.created_at DESC`,
      [req.params.poId]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.reportDiscrepancy = async (req, res) => {
  try {
    const { grn_item_id, discrepancy_type, description } = req.body;

    const result = await db.query(
      `INSERT INTO delivery_discrepancies (grn_item_id, discrepancy_type, description, reported_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [grn_item_id, discrepancy_type, description, req.user.employeeId]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
