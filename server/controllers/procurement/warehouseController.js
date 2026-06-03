const db = require('../../config/db');

exports.list = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    let conditions = [];
    let params = [];
    let idx = 1;

    if (req.query.is_active !== undefined) {
      conditions.push(`is_active = $${idx++}`);
      params.push(req.query.is_active === 'true');
    }
    if (req.query.search) {
      conditions.push(`(name ILIKE $${idx} OR warehouse_code ILIKE $${idx} OR city ILIKE $${idx})`);
      params.push(`%${req.query.search}%`);
      idx++;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await db.query(
      `SELECT *, COUNT(*) OVER() as total
       FROM warehouses
       ${whereClause}
       ORDER BY name ASC
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

    const warehouseResult = await db.query(
      `SELECT w.*,
       (SELECT COUNT(*) FROM warehouse_bins WHERE warehouse_id = w.id AND is_active = true)::int as bins_count,
       (SELECT COUNT(*) FROM inventory_items WHERE warehouse_id = w.id AND is_active = true)::int as items_count
       FROM warehouses w
       WHERE w.id = $1`,
      [id]
    );

    if (warehouseResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Warehouse not found' });
    }

    res.json({ success: true, data: warehouseResult.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, warehouse_code, address, city, notes } = req.body;

    const result = await db.query(
      `INSERT INTO warehouses (name, warehouse_code, address, city, notes, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING *`,
      [name, warehouse_code, address, city, notes]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, warehouse_code, address, city, notes, is_active } = req.body;

    const result = await db.query(
      `UPDATE warehouses
       SET name = $1, warehouse_code = $2, address = $3, city = $4,
           notes = $5, is_active = $6,
           updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [name, warehouse_code, address, city, notes, is_active, id]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getBins = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM warehouse_bins WHERE warehouse_id = $1 AND is_active = true ORDER BY bin_name',
      [req.params.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createBin = async (req, res) => {
  try {
    const { warehouse_id, name, code, max_capacity, notes } = req.body;
    const bin_name = name;
    const bin_code = code;
    const description = notes;

    const result = await db.query(
      `INSERT INTO warehouse_bins (warehouse_id, bin_name, bin_code, max_capacity, description, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING *`,
      [warehouse_id, bin_name, bin_code, max_capacity, description]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateBin = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, max_capacity, notes, is_active } = req.body;
    const bin_name = name;
    const bin_code = code;
    const description = notes;

    const existing = await db.query('SELECT * FROM warehouse_bins WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Bin not found' });
    }

    const result = await db.query(
      `UPDATE warehouse_bins
       SET bin_name = COALESCE($1, bin_name),
           bin_code = COALESCE($2, bin_code),
           max_capacity = COALESCE($3, max_capacity),
           description = COALESCE($4, description),
           is_active = COALESCE($5, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [bin_name, bin_code, max_capacity, description, is_active, id]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getStockByWarehouse = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT ii.*, ic.category_name
       FROM inventory_items ii
       JOIN inventory_categories ic ON ii.category_id = ic.id
       WHERE ii.warehouse_id = $1 AND ii.is_active = true
       ORDER BY ii.item_name ASC`,
      [id]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
