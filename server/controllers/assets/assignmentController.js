const db = require('../../config/db');

exports.list = async (req, res) => {
  try {
    const { status, asset_id, employee_id } = req.query;
    let query = `
      SELECT aa.*, a.asset_name, a.asset_code, a.asset_tag,
        ep.full_name as assigned_to_name,
        d.name as dept_name, epb.full_name as assigned_by_name
      FROM asset_assignments aa
      JOIN assets a ON a.id = aa.asset_id
      LEFT JOIN employee_profiles ep ON ep.id = aa.assigned_to
      LEFT JOIN departments d ON d.id = aa.assigned_department_id
      LEFT JOIN employee_profiles epb ON epb.id = aa.assigned_by
      WHERE 1=1
    `;
    const params = [];
    if (status) { params.push(status); query += ` AND aa.status = $${params.length}`; }
    if (asset_id) { params.push(asset_id); query += ` AND aa.asset_id = $${params.length}`; }
    if (employee_id) { params.push(employee_id); query += ` AND aa.assigned_to = $${params.length}`; }
    if (req.user.roleName === 'Employee') { params.push(req.user.employeeId); query += ` AND aa.assigned_to = $${params.length}`; }
    query += ' ORDER BY aa.created_at DESC LIMIT 100';
    const result = await db.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.checkout = async (req, res) => {
  try {
    const { asset_id, assigned_to, assigned_department_id, expected_return_date, condition_at_assignment, notes } = req.body;
    const asset = await db.query('SELECT * FROM assets WHERE id = $1', [asset_id]);
    if (!asset.rows[0]) return res.status(404).json({ success: false, message: 'Asset not found' });
    if (asset.rows[0].status !== 'available') return res.status(400).json({ success: false, message: 'Asset is not available for assignment' });

    const result = await db.query(
      `INSERT INTO asset_assignments (asset_id, assigned_to, assigned_department_id, expected_return_date, condition_at_assignment, notes, assigned_by, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'active') RETURNING *`,
      [asset_id, assigned_to, assigned_department_id, expected_return_date, condition_at_assignment, notes, req.user.employeeId]
    );

    await db.query(`UPDATE assets SET status = 'assigned', assigned_to = $1, department_id = COALESCE($2, department_id), updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
      [assigned_to, assigned_department_id, asset_id]);

    await db.query(`INSERT INTO asset_audit_log (asset_id, action, field_name, old_value, new_value, changed_by) VALUES ($1, 'ASSIGNED', 'status', 'available', 'assigned', $2)`,
      [asset_id, req.user.employeeId]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.checkin = async (req, res) => {
  try {
    const { condition_at_return, notes } = req.body;
    const assignment = await db.query('SELECT * FROM asset_assignments WHERE id = $1 AND status = $2', [req.params.id, 'active']);
    if (!assignment.rows[0]) return res.status(404).json({ success: false, message: 'Active assignment not found' });

    await db.query(
      `UPDATE asset_assignments SET status = 'returned', returned_date = CURRENT_DATE, condition_at_return = $1, notes = COALESCE($2, notes), updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
      [condition_at_return, notes, req.params.id]
    );

    await db.query(`UPDATE assets SET status = 'available', assigned_to = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [assignment.rows[0].asset_id]);

    await db.query(`INSERT INTO asset_audit_log (asset_id, action, field_name, old_value, new_value, changed_by) VALUES ($1, 'RETURNED', 'status', 'assigned', 'available', $2)`,
      [assignment.rows[0].asset_id, req.user.employeeId]);

    res.json({ success: true, message: 'Asset checked in successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.transfer = async (req, res) => {
  try {
    const { to_employee, to_department, to_location, reason } = req.body;
    const assetId = req.params.asset_id;

    const asset = await db.query('SELECT * FROM assets WHERE id = $1', [assetId]);
    if (!asset.rows[0]) return res.status(404).json({ success: false, message: 'Asset not found' });

    const fromEmployee = asset.rows[0].assigned_to;
    const fromDepartment = asset.rows[0].department_id;
    const fromLocation = asset.rows[0].location;

    const result = await db.query(
      `INSERT INTO asset_transfers (asset_id, from_employee, to_employee, from_department, to_department, from_location, to_location, reason, approved_by, approved_at, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,CURRENT_TIMESTAMP,'approved') RETURNING *`,
      [assetId, fromEmployee, to_employee, fromDepartment, to_department, fromLocation, to_location, reason, req.user.employeeId]
    );

    await db.query(`UPDATE assets SET assigned_to = $1, department_id = $2, location = COALESCE($3, location), updated_at = CURRENT_TIMESTAMP WHERE id = $4`,
      [to_employee, to_department, to_location, assetId]);

    if (fromEmployee && fromEmployee !== to_employee) {
      await db.query(`UPDATE asset_assignments SET status = 'transferred', updated_at = CURRENT_TIMESTAMP WHERE asset_id = $1 AND status = 'active'`, [assetId]);
      await db.query(
        `INSERT INTO asset_assignments (asset_id, assigned_to, assigned_department_id, condition_at_assignment, assigned_by, status)
         VALUES ($1,$2,$3,'Transferred from existing assignment',$4,'active')`,
        [assetId, to_employee, to_department, req.user.employeeId]
      );
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getTransfers = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT at.*, a.asset_name, a.asset_code,
        fep.full_name as from_employee_name,
        tep.full_name as to_employee_name,
        fd.name as from_dept_name, td.name as to_dept_name,
        aep.full_name as approved_by_name
      FROM asset_transfers at
      JOIN assets a ON a.id = at.asset_id
      LEFT JOIN employee_profiles fep ON fep.id = at.from_employee
      LEFT JOIN employee_profiles tep ON tep.id = at.to_employee
      LEFT JOIN departments fd ON fd.id = at.from_department
      LEFT JOIN departments td ON td.id = at.to_department
      LEFT JOIN employee_profiles aep ON aep.id = at.approved_by
      ORDER BY at.created_at DESC LIMIT 100
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
