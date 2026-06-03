const db = require('../../config/db');
const DepreciationEngine = require('../../services/depreciationEngine');

exports.list = async (req, res) => {
  try {
    const { category_id, department_id, status, lifecycle_status, search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    let query = `
      SELECT a.*, ac.category_name, d.name as department_name, 
        ep.full_name as assigned_name,
        v.vendor_name as supplier_name
      FROM assets a
      LEFT JOIN asset_categories ac ON ac.id = a.category_id
      LEFT JOIN departments d ON d.id = a.department_id
      LEFT JOIN employee_profiles ep ON ep.id = a.assigned_to
      LEFT JOIN vendors v ON v.id = a.supplier_id
      WHERE 1=1
    `;
    const params = [];
    if (category_id) { params.push(category_id); query += ` AND a.category_id = $${params.length}`; }
    if (department_id) { params.push(department_id); query += ` AND a.department_id = $${params.length}`; }
    if (status) { params.push(status); query += ` AND a.status = $${params.length}`; }
    if (lifecycle_status) { params.push(lifecycle_status); query += ` AND a.lifecycle_status = $${params.length}`; }
    if (search) { params.push(`%${search}%`); query += ` AND (a.asset_name ILIKE $${params.length} OR a.asset_tag ILIKE $${params.length} OR a.asset_code ILIKE $${params.length} OR a.serial_number ILIKE $${params.length})`; }
    if (req.user.roleName === 'Employee') { params.push(req.user.employeeId); query += ` AND a.assigned_to = $${params.length}`; }
    query += ' ORDER BY a.created_at DESC';
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    const countResult = await db.query('SELECT COUNT(*) FROM assets');
    res.json({ success: true, data: result.rows, total: parseInt(countResult.rows[0].count) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT a.*, ac.category_name, ac.default_depreciation_method, v.vendor_name,
        d.name as department_name, ep.full_name as assigned_name,
        cp.full_name as created_by_name
      FROM assets a
      LEFT JOIN asset_categories ac ON ac.id = a.category_id
      LEFT JOIN vendors v ON v.id = a.supplier_id
      LEFT JOIN departments d ON d.id = a.department_id
      LEFT JOIN employee_profiles ep ON ep.id = a.assigned_to
      LEFT JOIN employee_profiles cp ON cp.id = a.created_by
      WHERE a.id = $1
    `, [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Asset not found' });

    const [docs, assignments, maintenance, insurance, depreciation, disposals] = await Promise.all([
      db.query('SELECT * FROM asset_documents WHERE asset_id = $1 ORDER BY created_at DESC', [req.params.id]),
      db.query('SELECT aa.*, ep.full_name as assigned_to_name, d.name as dept_name FROM asset_assignments aa LEFT JOIN employee_profiles ep ON ep.id=aa.assigned_to LEFT JOIN departments d ON d.id=aa.assigned_department_id WHERE aa.asset_id=$1 ORDER BY aa.created_at DESC', [req.params.id]),
      db.query('SELECT * FROM maintenance_records WHERE asset_id = $1 ORDER BY created_at DESC LIMIT 10', [req.params.id]),
      db.query('SELECT * FROM asset_insurance_policies WHERE asset_id = $1 ORDER BY created_at DESC', [req.params.id]),
      db.query('SELECT * FROM depreciation_records WHERE asset_id = $1 ORDER BY period_year DESC, period_month DESC LIMIT 12', [req.params.id]),
      db.query('SELECT * FROM asset_disposals WHERE asset_id = $1', [req.params.id]),
    ]);

    res.json({
      success: true,
      data: {
        ...result.rows[0],
        documents: docs.rows,
        assignments: assignments.rows,
        maintenance: maintenance.rows,
        insurance: insurance.rows,
        depreciation: depreciation.rows,
        disposals: disposals.rows,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const {
      asset_name, category_id, sub_category, description, serial_number, model_number,
      manufacturer, supplier_id, purchase_date, purchase_cost, residual_value,
      depreciation_method, useful_life_years, warranty_expiry, condition, status,
      location, room, floor, building, department_id, notes
    } = req.body;

    const tagPrefix = category_id ? category_id.slice(0, 4).toUpperCase() : 'AST';
    const seq = await db.query("SELECT COALESCE(MAX(SUBSTRING(asset_code FROM '-(\\d+)')::int), 0) + 1 as next FROM assets WHERE asset_code LIKE $1", [`${tagPrefix}-%`]);
    const assetCode = `${tagPrefix}-${String(seq.rows[0].next).padStart(5, '0')}`;
    const assetTag = `TAG-${assetCode}`;

    const cost = parseFloat(purchase_cost) || 0;
    const residual = parseFloat(residual_value) || 0;
    const life = parseInt(useful_life_years) || 5;
    const method = depreciation_method || 'straight_line';

    let dep = { monthlyDepreciation: 0, depreciationRate: 0 };
    if (method === 'declining_balance') {
      const calc = DepreciationEngine.calculateDecliningBalance(cost, residual, life, 0);
      dep = { monthlyDepreciation: calc.annualDepreciation / 12, depreciationRate: calc.depreciationRate };
    } else {
      const calc = DepreciationEngine.calculateStraightLine(cost, residual, life);
      dep = { monthlyDepreciation: calc.monthlyDepreciation, depreciationRate: calc.depreciationRate };
    }

    const result = await db.query(
      `INSERT INTO assets (asset_tag, asset_code, asset_name, category_id, sub_category, description, serial_number, model_number,
       manufacturer, supplier_id, purchase_date, purchase_cost, current_value, residual_value, depreciation_method, useful_life_years,
       depreciation_rate, monthly_depreciation, warranty_expiry, condition, status, location, room, floor, building, department_id, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27) RETURNING *`,
      [assetTag, assetCode, asset_name, category_id, sub_category, description, serial_number, model_number, manufacturer,
       supplier_id, purchase_date, cost, cost, residual, method, life, dep.depreciationRate, dep.monthlyDepreciation,
       warranty_expiry, condition || 'new', status || 'available', location, room, floor, building, department_id, req.user.employeeId]
    );

    await db.query(`INSERT INTO asset_audit_log (asset_id, action, field_name, new_value, changed_by) VALUES ($1, 'ASSET_CREATED', 'status', $2, $3)`,
      [result.rows[0].id, 'created', req.user.employeeId]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const old = await db.query('SELECT * FROM assets WHERE id = $1', [req.params.id]);
    if (!old.rows[0]) return res.status(404).json({ success: false, message: 'Asset not found' });

    const allowed = ['asset_name', 'sub_category', 'description', 'serial_number', 'model_number', 'manufacturer',
      'supplier_id', 'location', 'room', 'floor', 'building', 'department_id', 'condition', 'status', 'notes',
      'warranty_expiry', 'warranty_notes'
    ];
    const updates = [];
    const params = [];
    let idx = 0;
    for (const field of allowed) {
      if (req.body[field] !== undefined) {
        idx++;
        updates.push(`${field} = $${idx}`);
        params.push(req.body[field]);
        const oldVal = old.rows[0][field] !== null ? String(old.rows[0][field]) : null;
        const newVal = String(req.body[field]);
        if (oldVal !== newVal) {
          await db.query(
            `INSERT INTO asset_audit_log (asset_id, action, field_name, old_value, new_value, changed_by) VALUES ($1, 'ASSET_UPDATED', $2, $3, $4, $5)`,
            [req.params.id, field, oldVal, newVal, req.user.employeeId]
          );
        }
      }
    }
    if (updates.length === 0) return res.status(400).json({ success: false, message: 'No fields to update' });
    idx++;
    params.push(req.params.id);
    const result = await db.query(`UPDATE assets SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx} RETURNING *`, params);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.runDepreciation = async (req, res) => {
  try {
    const results = await DepreciationEngine.runMonthlyDepreciation(db);
    res.json({ success: true, data: { processed: results.length, results } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const { document_type, document_name, description, expiry_date } = req.body;
    const filePath = `/uploads/${req.file.filename}`;
    const result = await db.query(
      `INSERT INTO asset_documents (asset_id, document_type, document_name, file_path, file_size, mime_type, description, expiry_date) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.params.id, document_type, document_name || req.file.originalname, filePath, req.file.size, req.file.mimetype, description, expiry_date]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM asset_categories ORDER BY category_name');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { category_name, category_code, description, default_depreciation_method, default_useful_life_years } = req.body;
    const result = await db.query(
      `INSERT INTO asset_categories (category_name, category_code, description, default_depreciation_method, default_useful_life_years) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [category_name, category_code, description, default_depreciation_method, default_useful_life_years]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getDisposals = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT ad.*, a.asset_name, a.asset_code, ac.category_name, a.purchase_cost, a.current_value
      FROM asset_disposals ad
      JOIN assets a ON a.id = ad.asset_id
      LEFT JOIN asset_categories ac ON ac.id = a.category_id
      ORDER BY ad.disposal_date DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createDisposal = async (req, res) => {
  try {
    const { asset_id, disposal_date, disposal_type, reason, disposal_value, buyer_name, buyer_contact, notes } = req.body;
    const asset = await db.query('SELECT * FROM assets WHERE id = $1', [asset_id]);
    if (!asset.rows[0]) return res.status(404).json({ success: false, message: 'Asset not found' });

    const bookValue = parseFloat(asset.rows[0].current_value) || 0;
    const disposalVal = parseFloat(disposal_value) || 0;
    const gainLoss = DepreciationEngine.calculateGainLoss(disposalVal, bookValue);

    const result = await db.query(
      `INSERT INTO asset_disposals (asset_id, disposal_date, disposal_type, reason, disposal_value, book_value, gain_loss, buyer_name, buyer_contact, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [asset_id, disposal_date, disposal_type, reason, disposalVal, bookValue, gainLoss, buyer_name, buyer_contact, notes]
    );

    await db.query(`UPDATE assets SET status = 'disposed', lifecycle_status = 'disposed', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [asset_id]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.approveDisposal = async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE asset_disposals SET approval_status = 'approved', approved_by = $1, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [req.user.employeeId, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Disposal record not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
