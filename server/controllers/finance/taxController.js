const db = require('../../config/db');

exports.list = async (req, res) => {
  try {
    const { tax_type, status } = req.query;
    let query = 'SELECT * FROM tax_records WHERE 1=1';
    const params = [];
    if (tax_type) { params.push(tax_type); query += ` AND tax_type = $${params.length}`; }
    if (status) { params.push(status); query += ` AND status = $${params.length}`; }
    query += ' ORDER BY due_date DESC';
    const result = await db.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { tax_type, tax_period, amount, due_date, notes } = req.body;
    const result = await db.query(
      `INSERT INTO tax_records (tax_type, tax_period, amount, balance, due_date, status) VALUES ($1,$2,$3,$3,$4,$5) RETURNING *`,
      [tax_type, tax_period, amount, due_date, due_date && new Date(due_date) < new Date() ? 'overdue' : 'pending']
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.pay = async (req, res) => {
  try {
    const { paid_amount, reference_number } = req.body;
    const tax = await db.query('SELECT * FROM tax_records WHERE id = $1', [req.params.id]);
    if (!tax.rows[0]) return res.status(404).json({ success: false, message: 'Tax record not found' });

    const newPaid = parseFloat(tax.rows[0].paid_amount) + parseFloat(paid_amount);
    const newBalance = parseFloat(tax.rows[0].amount) - newPaid;
    const newStatus = newBalance <= 0 ? 'paid' : 'partial';

    const result = await db.query(
      `UPDATE tax_records SET paid_amount=$1, balance=$2, status=$3, paid_date=CURRENT_DATE, reference_number=COALESCE($4,reference_number), updated_at=CURRENT_TIMESTAMP
       WHERE id=$5 RETURNING *`,
      [newPaid, Math.max(0, newBalance), newStatus, reference_number, req.params.id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
