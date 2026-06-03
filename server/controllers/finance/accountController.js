const db = require('../../config/db');

exports.getChartOfAccounts = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM chart_of_accounts ORDER BY account_code');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createAccount = async (req, res) => {
  try {
    const { account_code, account_name, account_type, category, description, parent_id } = req.body;
    const result = await db.query(
      `INSERT INTO chart_of_accounts (account_code, account_name, account_type, category, description, parent_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [account_code, account_name, account_type, category, description, parent_id || null]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.listTransactions = async (req, res) => {
  try {
    const { account_id, from_date, to_date, type, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    let query = `
      SELECT ft.*, a.account_code, a.account_name, d.name as department_name, e.employee_id as created_by_code
      FROM financial_transactions ft
      JOIN chart_of_accounts a ON a.id = ft.account_id
      LEFT JOIN departments d ON d.id = ft.department_id
      LEFT JOIN employee_profiles e ON e.id = ft.created_by
      WHERE 1=1
    `;
    const params = [];
    if (account_id) { params.push(account_id); query += ` AND ft.account_id = $${params.length}`; }
    if (from_date) { params.push(from_date); query += ` AND ft.transaction_date >= $${params.length}`; }
    if (to_date) { params.push(to_date); query += ` AND ft.transaction_date <= $${params.length}`; }
    if (type) { params.push(type); query += ` AND ft.transaction_type = $${params.length}`; }
    query += ' ORDER BY ft.transaction_date DESC, ft.created_at DESC';
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    const countResult = await db.query('SELECT COUNT(*) FROM financial_transactions');

    res.json({ success: true, data: result.rows, total: parseInt(countResult.rows[0].count) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createTransaction = async (req, res) => {
  try {
    const { transaction_date, description, debit, credit, account_id, transaction_type, reference_type, reference_id, department_id, notes } = req.body;
    const txNumber = `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const result = await db.query(
      `INSERT INTO financial_transactions (transaction_number, transaction_date, description, debit, credit, account_id, transaction_type, reference_type, reference_id, department_id, created_by, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [txNumber, transaction_date, description, debit || 0, credit || 0, account_id, transaction_type, reference_type, reference_id, department_id, req.user.employeeId, notes]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.listInvoices = async (req, res) => {
  try {
    const { status, type } = req.query;
    let query = 'SELECT * FROM invoices WHERE 1=1';
    const params = [];
    if (status) { params.push(status); query += ` AND status = $${params.length}`; }
    if (type) { params.push(type); query += ` AND invoice_type = $${params.length}`; }
    query += ' ORDER BY issue_date DESC';
    const result = await db.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createInvoice = async (req, res) => {
  try {
    const { invoice_type, client_name, client_email, issue_date, due_date, amount, line_items, notes } = req.body;
    const invNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const result = await db.query(
      `INSERT INTO invoices (invoice_number, invoice_type, client_name, client_email, issue_date, due_date, amount, balance, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$7,$8) RETURNING *`,
      [invNumber, invoice_type, client_name, client_email, issue_date, due_date, amount, notes]
    );
    const invoiceId = result.rows[0].id;
    if (line_items && line_items.length > 0) {
      for (const item of line_items) {
        const total = parseFloat(item.quantity || 1) * parseFloat(item.unit_price);
        await db.query(
          `INSERT INTO invoice_line_items (invoice_id, description, quantity, unit_price, total_price) VALUES ($1,$2,$3,$4,$5)`,
          [invoiceId, item.description, item.quantity || 1, item.unit_price, total]
        );
      }
    }
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
