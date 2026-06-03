const db = require('../../config/db');

exports.list = async (req, res) => {
  try {
    const { status, department_id, category, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    let query = `
      SELECT e.*, d.name as department_name, 
        a.employee_id as approved_by_code, 
        c.employee_id as created_by_code
      FROM expenses e
      LEFT JOIN departments d ON d.id = e.department_id
      LEFT JOIN employee_profiles a ON a.id = e.approved_by
      LEFT JOIN employee_profiles c ON c.id = e.created_by
      WHERE 1=1
    `;
    const params = [];
    if (status) { params.push(status); query += ` AND e.status = $${params.length}`; }
    if (department_id) { params.push(department_id); query += ` AND e.department_id = $${params.length}`; }
    if (category) { params.push(category); query += ` AND e.expense_category = $${params.length}`; }
    query += ' ORDER BY e.created_at DESC';
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    const countResult = await db.query('SELECT COUNT(*) FROM expenses', []);

    res.json({ success: true, data: result.rows, total: parseInt(countResult.rows[0].count) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT e.*, d.name as department_name, a.employee_id as approved_by_code, c.employee_id as created_by_code
      FROM expenses e
      LEFT JOIN departments d ON d.id = e.department_id
      LEFT JOIN employee_profiles a ON a.id = e.approved_by
      LEFT JOIN employee_profiles c ON c.id = e.created_by
      WHERE e.id = $1
    `, [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Expense not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { expense_category, description, amount, expense_date, department_id, paid_to, payment_method, notes } = req.body;
    const expenseNumber = `EXP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const result = await db.query(
      `INSERT INTO expenses (expense_number, expense_category, description, amount, expense_date, department_id, paid_to, payment_method, created_by, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [expenseNumber, expense_category, description, amount, expense_date, department_id || null, paid_to, payment_method, req.user.employeeId, notes]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { description, amount, expense_date, department_id, paid_to, payment_method, notes } = req.body;
    const result = await db.query(
      `UPDATE expenses SET description=$1, amount=$2, expense_date=$3, department_id=$4, paid_to=$5, payment_method=$6, notes=$7, updated_at=CURRENT_TIMESTAMP
       WHERE id=$8 AND status='pending' RETURNING *`,
      [description, amount, expense_date, department_id, paid_to, payment_method, notes, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Expense not found or cannot be edited' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.approve = async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE expenses SET status='approved', approved_by=$1, approved_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP
       WHERE id=$2 AND status='pending' RETURNING *`,
      [req.user.employeeId, req.params.id]
    );
    if (!result.rows[0]) return res.status(400).json({ success: false, message: 'Expense not found or already processed' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.reject = async (req, res) => {
  try {
    const { notes } = req.body;
    const result = await db.query(
      `UPDATE expenses SET status='rejected', notes=CASE WHEN $1 IS NOT NULL THEN $1 ELSE notes END, updated_at=CURRENT_TIMESTAMP
       WHERE id=$2 AND status='pending' RETURNING *`,
      [notes, req.params.id]
    );
    if (!result.rows[0]) return res.status(400).json({ success: false, message: 'Expense not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const result = await db.query('SELECT DISTINCT expense_category FROM expenses ORDER BY expense_category');
    res.json({ success: true, data: result.rows.map(r => r.expense_category) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.uploadReceipt = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const url = `/uploads/${req.file.filename}`;
    const result = await db.query('UPDATE expenses SET receipt_url=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING *', [url, req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Expense not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
