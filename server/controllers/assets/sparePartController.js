const db = require('../../config/db');

exports.list = async (req, res) => {
  try {
    const { category, low_stock } = req.query;
    let query = 'SELECT sp.*, v.vendor_name FROM spare_parts sp LEFT JOIN vendors v ON v.id = sp.supplier_id WHERE 1=1';
    const params = [];
    if (category) { params.push(category); query += ` AND sp.category = $${params.length}`; }
    if (low_stock === 'true') { query += ' AND sp.quantity_in_stock <= sp.reorder_level'; }
    query += ' ORDER BY sp.part_name';
    const result = await db.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const part = await db.query('SELECT sp.*, v.vendor_name FROM spare_parts sp LEFT JOIN vendors v ON v.id = sp.supplier_id WHERE sp.id = $1', [req.params.id]);
    if (!part.rows[0]) return res.status(404).json({ success: false, message: 'Part not found' });
    const movements = await db.query('SELECT sm.*, ep.full_name as created_by_name FROM stock_movements sm LEFT JOIN employee_profiles ep ON ep.id=sm.created_by WHERE sm.part_id = $1 ORDER BY sm.created_at DESC LIMIT 50', [req.params.id]);
    res.json({ success: true, data: { ...part.rows[0], movements: movements.rows } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { part_code, part_name, description, category, unit_of_measure, quantity_in_stock, reorder_level, reorder_quantity, unit_cost, supplier_id, location, min_stock_level, max_stock_level, notes } = req.body;
    const code = part_code || `SP-${Date.now()}`;
    const result = await db.query(
      `INSERT INTO spare_parts (part_code, part_name, description, category, unit_of_measure, quantity_in_stock, reorder_level, reorder_quantity, unit_cost, supplier_id, location, min_stock_level, max_stock_level, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [code, part_name, description, category, unit_of_measure, quantity_in_stock || 0, reorder_level || 0, reorder_quantity || 0, unit_cost || 0, supplier_id || null, location, min_stock_level || 0, max_stock_level || 0, notes]
    );
    if (quantity_in_stock > 0) {
      await db.query(
        `INSERT INTO stock_movements (part_id, movement_type, quantity, unit_cost, total_cost, notes, created_by)
         VALUES ($1,'initial', $2, $3, $4, 'Initial stock entry', $5)`,
        [result.rows[0].id, quantity_in_stock, unit_cost || 0, (quantity_in_stock || 0) * (unit_cost || 0), req.user.employeeId]
      );
    }
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { part_name, description, category, unit_of_measure, reorder_level, reorder_quantity, unit_cost, supplier_id, location, min_stock_level, max_stock_level, notes } = req.body;
    const result = await db.query(
      `UPDATE spare_parts SET part_name = COALESCE($1, part_name), description = COALESCE($2, description), category = COALESCE($3, category), unit_of_measure = COALESCE($4, unit_of_measure), reorder_level = COALESCE($5, reorder_level), reorder_quantity = COALESCE($6, reorder_quantity), unit_cost = COALESCE($7, unit_cost), supplier_id = COALESCE($8, supplier_id), location = COALESCE($9, location), min_stock_level = COALESCE($10, min_stock_level), max_stock_level = COALESCE($11, max_stock_level), notes = COALESCE($12, notes), updated_at = CURRENT_TIMESTAMP WHERE id = $13 RETURNING *`,
      [part_name, description, category, unit_of_measure, reorder_level, reorder_quantity, unit_cost, supplier_id, location, min_stock_level, max_stock_level, notes, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Part not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.addStock = async (req, res) => {
  try {
    const { quantity, unit_cost, notes } = req.body;
    const qty = parseInt(quantity) || 0;
    if (qty <= 0) return res.status(400).json({ success: false, message: 'Quantity must be positive' });

    const part = await db.query('SELECT * FROM spare_parts WHERE id = $1', [req.params.id]);
    if (!part.rows[0]) return res.status(404).json({ success: false, message: 'Part not found' });

    const cost = unit_cost || part.rows[0].unit_cost;
    const totalCost = qty * parseFloat(cost);

    await db.query('UPDATE spare_parts SET quantity_in_stock = quantity_in_stock + $1, unit_cost = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [qty, cost, req.params.id]);

    await db.query(
      `INSERT INTO stock_movements (part_id, movement_type, quantity, unit_cost, total_cost, notes, created_by)
       VALUES ($1, 'purchase', $2, $3, $4, $5, $6)`,
      [req.params.id, qty, cost, totalCost, notes || 'Stock added', req.user.employeeId]
    );

    res.json({ success: true, message: 'Stock added successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.removeStock = async (req, res) => {
  try {
    const { quantity, notes } = req.body;
    const qty = parseInt(quantity) || 0;
    if (qty <= 0) return res.status(400).json({ success: false, message: 'Quantity must be positive' });

    const part = await db.query('SELECT * FROM spare_parts WHERE id = $1', [req.params.id]);
    if (!part.rows[0]) return res.status(404).json({ success: false, message: 'Part not found' });
    if (part.rows[0].quantity_in_stock < qty) return res.status(400).json({ success: false, message: 'Insufficient stock' });

    const totalCost = qty * parseFloat(part.rows[0].unit_cost);

    await db.query('UPDATE spare_parts SET quantity_in_stock = quantity_in_stock - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [qty, req.params.id]);

    await db.query(
      `INSERT INTO stock_movements (part_id, movement_type, quantity, unit_cost, total_cost, notes, created_by)
       VALUES ($1, 'usage', $2, $3, $4, $5, $6)`,
      [req.params.id, -qty, part.rows[0].unit_cost, totalCost, notes || 'Stock removed', req.user.employeeId]
    );

    res.json({ success: true, message: 'Stock removed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getLowStock = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT sp.*, v.vendor_name, (sp.reorder_level - sp.quantity_in_stock) as shortfall
      FROM spare_parts sp
      LEFT JOIN vendors v ON v.id = sp.supplier_id
      WHERE sp.quantity_in_stock <= sp.reorder_level
      ORDER BY (sp.quantity_in_stock::float / NULLIF(sp.reorder_level, 0)) ASC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
