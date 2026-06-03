const db = require('../../config/db');
const PayrollEngine = require('../../services/payrollEngine');

exports.list = async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    let query = `
      SELECT pp.*, ep.employee_id as approved_by_code, e2.employee_id as processed_by_code
      FROM payroll_periods pp
      LEFT JOIN employee_profiles ep ON ep.id = pp.approved_by
      LEFT JOIN employee_profiles e2 ON e2.id = pp.processed_by
    `;
    const params = [];
    if (status) {
      params.push(status);
      query += ` WHERE pp.status = $${params.length}`;
    }
    query += ' ORDER BY pp.period_year DESC, pp.period_month DESC';
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    const countResult = await db.query('SELECT COUNT(*) FROM payroll_periods' + (status ? ' WHERE status = $1' : ''), status ? [status] : []);

    res.json({ success: true, data: result.rows, total: parseInt(countResult.rows[0].count) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getPeriod = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT pp.*, a.employee_id as approved_by_code, p.employee_id as processed_by_code
      FROM payroll_periods pp
      LEFT JOIN employee_profiles a ON a.id = pp.approved_by
      LEFT JOIN employee_profiles p ON p.id = pp.processed_by
      WHERE pp.id = $1
    `, [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Payroll period not found' });
    const entries = await db.query(`
      SELECT p.*, ep.employee_id, ep.full_name as employee_name, ep.department_id, d.name as department_name
      FROM payroll p
      JOIN employee_profiles ep ON ep.id = p.employee_id
      LEFT JOIN departments d ON d.id = ep.department_id
      WHERE p.payroll_period_id = $1 ORDER BY ep.employee_id
    `, [req.params.id]);
    res.json({ success: true, data: { ...result.rows[0], entries: entries.rows } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createPeriod = async (req, res) => {
  try {
    const { period_name, period_year, period_month, start_date, end_date, payment_date } = req.body;
    const result = await db.query(
      `INSERT INTO payroll_periods (period_name, period_year, period_month, start_date, end_date, payment_date) 
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [period_name, period_year, period_month, start_date, end_date, payment_date]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.closePeriod = async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE payroll_periods SET status = 'closed', updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND status = 'approved' RETURNING *`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(400).json({ success: false, message: 'Period not found or not in approved status' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.processPayroll = async (req, res) => {
  try {
    const result = await PayrollEngine.processPayroll(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.approvePayroll = async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE payroll_periods SET status = 'approved', approved_by = $1, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 AND status = 'processing' RETURNING *`,
      [req.user.employeeId, req.params.id]
    );
    if (!result.rows[0]) return res.status(400).json({ success: false, message: 'Cannot approve - period not in processing status' });

    await db.query(`UPDATE payroll SET payment_status = 'paid' WHERE payroll_period_id = $1`, [req.params.id]);
    await PayrollEngine.generatePayslips(req.params.id);

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getSalaryStructures = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT ss.*, ep.employee_id, ep.full_name as employee_name, d.name as department_name
      FROM salary_structures ss
      JOIN employee_profiles ep ON ep.id = ss.employee_id
      LEFT JOIN departments d ON d.id = ep.department_id
      ORDER BY ss.created_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createSalaryStructure = async (req, res) => {
  try {
    const { employee_id, basic_salary, housing_allowance, transport_allowance, medical_allowance, leave_allowance, effective_from } = req.body;
    const gross = basic_salary + (housing_allowance || 0) + (transport_allowance || 0) + (medical_allowance || 0) + (leave_allowance || 0);
    const taxEngine = require('../../services/taxEngine');
    const paye = taxEngine.calculatePAYE(gross);
    const sha = taxEngine.calculateSHA(gross);
    const net = gross - paye - sha;

    const result = await db.query(
      `INSERT INTO salary_structures (employee_id, basic_salary, housing_allowance, transport_allowance, medical_allowance, leave_allowance, paye_tax, sha_deduction, net_salary, effective_from) 
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [employee_id, basic_salary, housing_allowance || 0, transport_allowance || 0, medical_allowance || 0, leave_allowance || 0, paye, sha, net, effective_from]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getPayslips = async (req, res) => {
  try {
    let query = `
      SELECT ps.*, pp.period_name, pp.period_month, pp.period_year, ep.employee_id, ep.full_name as employee_name
      FROM payslips ps
      JOIN payroll p ON p.id = ps.payroll_id
      JOIN payroll_periods pp ON pp.id = p.payroll_period_id
      JOIN employee_profiles ep ON ep.id = ps.employee_id
    `;
    const params = [];
    if (req.user.roleName === 'Employee') {
      params.push(req.user.employeeId);
      query += ` WHERE ps.employee_id = $${params.length}`;
    }
    query += ' ORDER BY ps.generated_at DESC LIMIT 100';
    const result = await db.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
