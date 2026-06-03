const db = require('../../config/db');

exports.list = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM vendors ORDER BY vendor_name');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT v.*, (SELECT COUNT(*) FROM assets WHERE supplier_id = v.id) as asset_count,
        (SELECT COUNT(*) FROM maintenance_records WHERE vendor_id = v.id) as service_count,
        (SELECT COUNT(*) FROM spare_parts WHERE supplier_id = v.id) as part_count
      FROM vendors v WHERE v.id = $1
    `, [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Vendor not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { vendor_code, vendor_name, contact_person, email, phone, address, city, country, tax_id, payment_terms, services, notes } = req.body;
    const code = vendor_code || `VEN-${Date.now()}`;
    const result = await db.query(
      `INSERT INTO vendors (vendor_code, vendor_name, contact_person, email, phone, address, city, country, tax_id, payment_terms, services, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [code, vendor_name, contact_person, email, phone, address, city, country, tax_id, payment_terms, services, notes]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { vendor_name, contact_person, email, phone, address, city, country, tax_id, payment_terms, services, is_active, notes } = req.body;
    const result = await db.query(
      `UPDATE vendors SET vendor_name = COALESCE($1, vendor_name), contact_person = COALESCE($2, contact_person), email = COALESCE($3, email), phone = COALESCE($4, phone), address = COALESCE($5, address), city = COALESCE($6, city), country = COALESCE($7, country), tax_id = COALESCE($8, tax_id), payment_terms = COALESCE($9, payment_terms), services = COALESCE($10, services), is_active = COALESCE($11, is_active), notes = COALESCE($12, notes), updated_at = CURRENT_TIMESTAMP WHERE id = $13 RETURNING *`,
      [vendor_name, contact_person, email, phone, address, city, country, tax_id, payment_terms, services, is_active, notes, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Vendor not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
