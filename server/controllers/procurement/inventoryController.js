const db = require('../../config/db');
const InventoryEngine = require('../../services/inventoryEngine');

exports.list = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    let conditions = ['ii.is_active = true'];
    let params = [];
    let idx = 1;

    if (req.query.category_id) {
      conditions.push(`ii.category_id = $${idx++}`);
      params.push(req.query.category_id);
    }
    if (req.query.warehouse_id) {
      conditions.push(`ii.warehouse_id = $${idx++}`);
      params.push(req.query.warehouse_id);
    }
    if (req.query.is_active !== undefined) {
      conditions.push(`ii.is_active = $${idx++}`);
      params.push(req.query.is_active === 'true');
    }
    if (req.query.search) {
      conditions.push(`(ii.item_name ILIKE $${idx} OR ii.item_code ILIKE $${idx})`);
      params.push(`%${req.query.search}%`);
      idx++;
    }
    if (req.query.low_stock === 'true') {
      conditions.push(`ii.current_quantity <= ii.reorder_point`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const result = await db.query(
      `SELECT ii.*, ic.category_name, w.name as warehouse_name,
       wb.bin_name, ps.supplier_name,
       COUNT(*) OVER() as total
       FROM inventory_items ii
       JOIN inventory_categories ic ON ii.category_id = ic.id
       JOIN warehouses w ON ii.warehouse_id = w.id
       LEFT JOIN warehouse_bins wb ON ii.bin_id = wb.id
       LEFT JOIN procurement_suppliers ps ON ii.supplier_id = ps.id
       ${whereClause}
       ORDER BY ii.item_name ASC
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

    const itemResult = await db.query(
      `SELECT ii.*, ic.category_name, ic.id as category_id,
       w.name as warehouse_name, w.id as warehouse_id,
       wb.bin_name, wb.id as bin_id,
       ps.supplier_name, ps.id as supplier_id
       FROM inventory_items ii
       JOIN inventory_categories ic ON ii.category_id = ic.id
       JOIN warehouses w ON ii.warehouse_id = w.id
       LEFT JOIN warehouse_bins wb ON ii.bin_id = wb.id
       LEFT JOIN procurement_suppliers ps ON ii.supplier_id = ps.id
       WHERE ii.id = $1`,
      [id]
    );

    if (itemResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Inventory item not found' });
    }

    const movementsResult = await db.query(
      `SELECT psm.*, ep.full_name as created_by_name
       FROM procurement_stock_movements psm
       LEFT JOIN employee_profiles ep ON psm.created_by = ep.id
       WHERE psm.item_id = $1
       ORDER BY psm.created_at DESC
       LIMIT 20`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...itemResult.rows[0],
        recent_movements: movementsResult.rows
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { category_id, warehouse_id, bin_id, item_name, description, unit_of_measure, current_quantity, reorder_point, reorder_quantity, supplier_id, unit_cost } = req.body;

    const itemCode = await InventoryEngine.generateItemCode(category_id);

    const result = await db.query(
      `INSERT INTO inventory_items (item_code, item_name, description, category_id, warehouse_id, bin_id, unit_of_measure, current_quantity, reorder_point, reorder_quantity, supplier_id, unit_cost, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true)
       RETURNING *`,
      [itemCode, item_name, description, category_id, warehouse_id, bin_id, unit_of_measure, current_quantity || 0, reorder_point, reorder_quantity, supplier_id, unit_cost]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { item_name, description, category_id, warehouse_id, bin_id, unit_of_measure, reorder_point, reorder_quantity, supplier_id, unit_cost } = req.body;

    const existing = await db.query('SELECT * FROM inventory_items WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Inventory item not found' });
    }

    const result = await db.query(
      `UPDATE inventory_items
       SET item_name = COALESCE($1, item_name),
           description = COALESCE($2, description),
           category_id = COALESCE($3, category_id),
           warehouse_id = COALESCE($4, warehouse_id),
           bin_id = COALESCE($5, bin_id),
           unit_of_measure = COALESCE($6, unit_of_measure),
           reorder_point = COALESCE($7, reorder_point),
           reorder_quantity = COALESCE($8, reorder_quantity),
           supplier_id = COALESCE($9, supplier_id),
           unit_cost = COALESCE($10, unit_cost),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $11
       RETURNING *`,
      [item_name, description, category_id, warehouse_id, bin_id, unit_of_measure, reorder_point, reorder_quantity, supplier_id, unit_cost, id]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `UPDATE inventory_items SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Inventory item not found' });
    }

    res.json({ success: true, message: 'Inventory item deactivated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM inventory_categories WHERE is_active = true ORDER BY category_name'
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { category_name, description } = req.body;

    const result = await db.query(
      `INSERT INTO inventory_categories (category_name, description, is_active) VALUES ($1, $2, true) RETURNING *`,
      [category_name, description]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getStockValue = async (req, res) => {
  try {
    const result = await InventoryEngine.getStockValue();
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getLowStock = async (req, res) => {
  try {
    const result = await InventoryEngine.getLowStockItems();
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMovements = async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const result = await db.query(
      `SELECT psm.*, ep.full_name as created_by_name,
       COUNT(*) OVER() as total
       FROM procurement_stock_movements psm
       LEFT JOIN employee_profiles ep ON psm.created_by = ep.id
       WHERE psm.item_id = $1
       ORDER BY psm.created_at DESC
       LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    );

    const total = result.rows.length > 0 ? parseInt(result.rows[0].total) : 0;

    res.json({ success: true, data: result.rows, total, page, limit });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.recordMovement = async (req, res) => {
  try {
    const { item_id, quantity, movement_type, unit_cost, reference_type, reference_id, notes } = req.body;

    const itemResult = await db.query(
      'SELECT * FROM inventory_items WHERE id = $1 AND is_active = true',
      [item_id]
    );

    if (itemResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Inventory item not found' });
    }

    const item = itemResult.rows[0];

    if ((movement_type === 'out' || movement_type === 'transfer') && item.current_quantity < quantity) {
      return res.status(400).json({ success: false, message: 'Insufficient stock' });
    }

    await InventoryEngine.updateStock(item_id, quantity, movement_type, unit_cost, reference_type, reference_id, req.user.employeeId, notes);

    await db.query(
      `INSERT INTO procurement_audit_log (entity_type, entity_id, action, changed_by, notes)
       VALUES ('inventory_item', $1, 'stock_movement', $2, $3)`,
      [item_id, req.user.employeeId, JSON.stringify({ quantity, movement_type, reference_type, reference_id })]
    );

    res.status(201).json({ success: true, message: 'Stock movement recorded' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
