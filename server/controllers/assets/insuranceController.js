const db = require('../../config/db');
const MaintenanceEngine = require('../../services/maintenanceEngine');

exports.list = async (req, res) => {
  try {
    const { status, insurance_type } = req.query;
    let query = `
      SELECT aip.*, a.asset_name, a.asset_code, fv.registration_number, fv.vehicle_code
      FROM asset_insurance_policies aip
      LEFT JOIN assets a ON a.id = aip.asset_id
      LEFT JOIN fleet_vehicles fv ON fv.id = aip.vehicle_id
      WHERE 1=1
    `;
    const params = [];
    if (status) { params.push(status); query += ` AND aip.status = $${params.length}`; }
    if (insurance_type) { params.push(insurance_type); query += ` AND aip.insurance_type = $${params.length}`; }
    query += ' ORDER BY aip.end_date ASC';
    const result = await db.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const policy = await db.query(`
      SELECT aip.*, a.asset_name, a.asset_code, a.purchase_cost, a.current_value, fv.registration_number, fv.vehicle_code
      FROM asset_insurance_policies aip
      LEFT JOIN assets a ON a.id = aip.asset_id
      LEFT JOIN fleet_vehicles fv ON fv.id = aip.vehicle_id
      WHERE aip.id = $1
    `, [req.params.id]);
    if (!policy.rows[0]) return res.status(404).json({ success: false, message: 'Policy not found' });
    const claims = await db.query('SELECT * FROM insurance_claims WHERE policy_id = $1 ORDER BY claim_date DESC', [req.params.id]);
    res.json({ success: true, data: { ...policy.rows[0], claims: claims.rows } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { insurance_type, provider, provider_contact, provider_phone, provider_email, asset_id, vehicle_id, coverage_type, coverage_amount, premium_amount, premium_frequency, start_date, end_date, policy_number, notes } = req.body;
    const polNum = policy_number || `POL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const result = await db.query(
      `INSERT INTO asset_insurance_policies (policy_number, insurance_type, provider, provider_contact, provider_phone, provider_email, asset_id, vehicle_id, coverage_type, coverage_amount, premium_amount, premium_frequency, start_date, end_date, renewal_date, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$14,$15) RETURNING *`,
      [polNum, insurance_type, provider, provider_contact, provider_phone, provider_email, asset_id || null, vehicle_id || null, coverage_type, coverage_amount, premium_amount, premium_frequency, start_date, end_date, notes]
    );

    if (vehicle_id) {
      await db.query('UPDATE fleet_vehicles SET insurance_policy_id = $1 WHERE id = $2', [result.rows[0].id, vehicle_id]);
    }

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { provider, provider_contact, provider_phone, provider_email, coverage_type, coverage_amount, premium_amount, end_date, status, notes } = req.body;
    const result = await db.query(
      `UPDATE asset_insurance_policies SET provider = COALESCE($1, provider), provider_contact = COALESCE($2, provider_contact), provider_phone = COALESCE($3, provider_phone), provider_email = COALESCE($4, provider_email), coverage_type = COALESCE($5, coverage_type), coverage_amount = COALESCE($6, coverage_amount), premium_amount = COALESCE($7, premium_amount), end_date = COALESCE($8, end_date), status = COALESCE($9, status), renewal_date = $8, notes = COALESCE($10, notes), updated_at = CURRENT_TIMESTAMP WHERE id = $11 RETURNING *`,
      [provider, provider_contact, provider_phone, provider_email, coverage_type, coverage_amount, premium_amount, end_date, status, notes, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Policy not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getExpiring = async (req, res) => {
  try {
    const data = await MaintenanceEngine.checkInsuranceExpiry();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createClaim = async (req, res) => {
  try {
    const { claim_date, description, claim_amount, incident_date, incident_type, notes } = req.body;
    const claimNumber = `CLM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const result = await db.query(
      `INSERT INTO insurance_claims (policy_id, claim_number, claim_date, description, claim_amount, incident_date, incident_type, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.params.id, claimNumber, claim_date, description, claim_amount, incident_date, incident_type, notes]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateClaim = async (req, res) => {
  try {
    const { status, approved_amount, resolution_date, notes } = req.body;
    const result = await db.query(
      `UPDATE insurance_claims SET status = COALESCE($1, status), approved_amount = COALESCE($2, approved_amount), resolution_date = COALESCE($3, resolution_date), notes = COALESCE($4, notes), updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *`,
      [status, approved_amount, resolution_date, notes, req.params.claimId]
    );
    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Claim not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.listClaims = async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT ic.*, aip.policy_number, aip.provider, a.asset_name, a.asset_code, fv.registration_number
      FROM insurance_claims ic
      JOIN asset_insurance_policies aip ON aip.id = ic.policy_id
      LEFT JOIN assets a ON a.id = aip.asset_id
      LEFT JOIN fleet_vehicles fv ON fv.id = aip.vehicle_id
      WHERE 1=1
    `;
    const params = [];
    if (status) { params.push(status); query += ` AND ic.status = $${params.length}`; }
    query += ' ORDER BY ic.claim_date DESC LIMIT 100';
    const result = await db.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
