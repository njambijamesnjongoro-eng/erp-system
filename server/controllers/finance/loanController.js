const db = require('../../config/db');

exports.list = async (req, res) => {
  try {
    const { status, type } = req.query;
    let query = 'SELECT l.* FROM loans l WHERE 1=1';
    const params = [];
    if (status) { params.push(status); query += ` AND l.status = $${params.length}`; }
    if (type) { params.push(type); query += ` AND l.loan_type = $${params.length}`; }
    query += ' ORDER BY l.created_at DESC';
    const result = await db.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const loan = await db.query('SELECT * FROM loans WHERE id = $1', [req.params.id]);
    if (!loan.rows[0]) return res.status(404).json({ success: false, message: 'Loan not found' });
    const repayments = await db.query('SELECT * FROM loan_repayments WHERE loan_id = $1 ORDER BY payment_date', [req.params.id]);
    res.json({ success: true, data: { ...loan.rows[0], repayments: repayments.rows } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { loan_type, description, principal_amount, interest_rate, start_date, end_date, lender, payment_frequency, installment_amount, notes } = req.body;
    const rate = parseFloat(interest_rate || 0) / 100;
    const totalAmount = parseFloat(principal_amount) * (1 + rate);
    const loanNumber = `LN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const result = await db.query(
      `INSERT INTO loans (loan_number, loan_type, description, principal_amount, interest_rate, total_amount, balance, start_date, end_date, lender, payment_frequency, installment_amount, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [loanNumber, loan_type, description, principal_amount, interest_rate, totalAmount, start_date, end_date || null, lender, payment_frequency, installment_amount || 0, notes]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.makePayment = async (req, res) => {
  try {
    const { amount, payment_date, payment_method, reference_number, notes } = req.body;
    const loan = await db.query('SELECT * FROM loans WHERE id = $1', [req.params.id]);
    if (!loan.rows[0]) return res.status(404).json({ success: false, message: 'Loan not found' });

    const oldBalance = parseFloat(loan.rows[0].balance);
    const newBalance = Math.max(0, oldBalance - parseFloat(amount));
    const amountPaid = parseFloat(loan.rows[0].amount_paid) + parseFloat(amount);

    const interestPaid = parseFloat(loan.rows[0].total_amount) - parseFloat(loan.rows[0].principal_amount);
    const principalPaid = parseFloat(amount) - interestPaid;

    await db.query(
      `INSERT INTO loan_repayments (loan_id, payment_date, amount, principal_paid, interest_paid, balance_after, payment_method, reference_number, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [req.params.id, payment_date, amount, Math.max(0, principalPaid), Math.max(0, interestPaid), newBalance, payment_method, reference_number, notes]
    );

    const newStatus = newBalance <= 0 ? 'paid' : 'active';
    const result = await db.query(
      `UPDATE loans SET amount_paid=$1, balance=$2, status=$3, updated_at=CURRENT_TIMESTAMP WHERE id=$4 RETURNING *`,
      [amountPaid, newBalance, newStatus, req.params.id]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.listEmployeeLoans = async (req, res) => {
  try {
    let query = `
      SELECT el.*, ep.employee_id, ep.full_name as employee_name
      FROM employee_loans el
      JOIN employee_profiles ep ON ep.id = el.employee_id
    `;
    const params = [];
    if (req.user.roleName === 'Employee') {
      params.push(req.user.employeeId);
      query += ` WHERE el.employee_id = $${params.length}`;
    }
    query += ' ORDER BY el.created_at DESC';
    const result = await db.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createEmployeeLoan = async (req, res) => {
  try {
    const { employee_id, principal_amount, interest_rate, installment_amount, total_installments, start_date, notes } = req.body;
    const rate = parseFloat(interest_rate || 0) / 100;
    const totalAmount = parseFloat(principal_amount) * (1 + rate);
    const loanNumber = `SAL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const installment = parseFloat(installment_amount) || (totalAmount / (total_installments || 1));
    const result = await db.query(
      `INSERT INTO employee_loans (employee_id, loan_number, principal_amount, interest_rate, total_amount, balance, installment_amount, total_installments, start_date, end_date)
       VALUES ($1,$2,$3,$4,$5,$5,$6,$7,$8,$9) RETURNING *`,
      [employee_id, loanNumber, principal_amount, interest_rate, totalAmount, installment, total_installments || 1, start_date, start_date]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
