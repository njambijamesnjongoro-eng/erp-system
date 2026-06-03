const db = require('../../config/db');

exports.list = async (req, res) => {
  try {
    const { fiscal_year, department_id, status } = req.query;
    let query = `
      SELECT b.*, d.name as department_name, a.employee_id as approved_by_code
      FROM budgets b
      LEFT JOIN departments d ON d.id = b.department_id
      LEFT JOIN employee_profiles a ON a.id = b.approved_by
      WHERE 1=1
    `;
    const params = [];
    if (fiscal_year) { params.push(fiscal_year); query += ` AND b.fiscal_year = $${params.length}`; }
    if (department_id) { params.push(department_id); query += ` AND b.department_id = $${params.length}`; }
    if (status) { params.push(status); query += ` AND b.status = $${params.length}`; }
    query += ' ORDER BY b.fiscal_year DESC, b.created_at DESC';
    const result = await db.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const budget = await db.query(`
      SELECT b.*, d.name as department_name, a.employee_id as approved_by_code
      FROM budgets b
      LEFT JOIN departments d ON d.id = b.department_id
      LEFT JOIN employee_profiles a ON a.id = b.approved_by
      WHERE b.id = $1
    `, [req.params.id]);
    if (!budget.rows[0]) return res.status(404).json({ success: false, message: 'Budget not found' });
    const lineItems = await db.query('SELECT * FROM budget_line_items WHERE budget_id = $1', [req.params.id]);
    res.json({ success: true, data: { ...budget.rows[0], lineItems: lineItems.rows } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { budget_name, department_id, fiscal_year, total_amount, line_items } = req.body;
    const result = await db.query(
      `INSERT INTO budgets (budget_name, department_id, fiscal_year, total_amount, allocated_amount, remaining_amount)
       VALUES ($1,$2,$3,$4,$4,$4) RETURNING *`,
      [budget_name, department_id || null, fiscal_year, total_amount]
    );
    const budgetId = result.rows[0].id;

    if (line_items && line_items.length > 0) {
      for (const item of line_items) {
        await db.query(
          `INSERT INTO budget_line_items (budget_id, category, allocated, remaining) VALUES ($1,$2,$3,$3)`,
          [budgetId, item.category, item.allocated]
        );
      }
      const totalAllocated = line_items.reduce((s, i) => s + parseFloat(i.allocated || 0), 0);
      await db.query('UPDATE budgets SET allocated_amount = $1 WHERE id = $2', [totalAllocated, budgetId]);
    }

    const budget = await db.query('SELECT * FROM budgets WHERE id = $1', [budgetId]);
    res.status(201).json({ success: true, data: budget.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { budget_name, total_amount, status } = req.body;
    const result = await db.query(
      `UPDATE budgets SET budget_name=COALESCE($1,budget_name), total_amount=COALESCE($2,total_amount), status=COALESCE($3,status), updated_at=CURRENT_TIMESTAMP
       WHERE id=$4 RETURNING *`,
      [budget_name, total_amount, status, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Budget not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.approve = async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE budgets SET status='approved', approved_by=$1, approved_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP
       WHERE id=$2 AND status='draft' RETURNING *`,
      [req.user.employeeId, req.params.id]
    );
    if (!result.rows[0]) return res.status(400).json({ success: false, message: 'Budget not found or not in draft' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
