const db = require('../../config/db');
const MaintenanceEngine = require('../../services/maintenanceEngine');

exports.list = async (req, res) => {
  try {
    const { status, asset_id, vehicle_id, maintenance_type, priority } = req.query;
    let query = `
      SELECT mr.*, a.asset_name, a.asset_code, fv.registration_number, fv.vehicle_code, v.vendor_name,
        ep.full_name as approved_by_name
      FROM maintenance_records mr
      LEFT JOIN assets a ON a.id = mr.asset_id
      LEFT JOIN fleet_vehicles fv ON fv.id = mr.vehicle_id
      LEFT JOIN vendors v ON v.id = mr.vendor_id
      LEFT JOIN employee_profiles ep ON ep.id = mr.approved_by
      WHERE 1=1
    `;
    const params = [];
    if (status) { params.push(status); query += ` AND mr.status = $${params.length}`; }
    if (asset_id) { params.push(asset_id); query += ` AND mr.asset_id = $${params.length}`; }
    if (vehicle_id) { params.push(vehicle_id); query += ` AND mr.vehicle_id = $${params.length}`; }
    if (maintenance_type) { params.push(maintenance_type); query += ` AND mr.maintenance_type = $${params.length}`; }
    if (priority) { params.push(priority); query += ` AND mr.priority = $${params.length}`; }
    query += ' ORDER BY mr.scheduled_date ASC NULLS LAST, mr.created_at DESC';
    const result = await db.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT mr.*, a.asset_name, a.asset_code, a.asset_tag, fv.registration_number, fv.vehicle_code,
        v.vendor_name, v.contact_person as vendor_contact, ep.full_name as created_by_name
      FROM maintenance_records mr
      LEFT JOIN assets a ON a.id = mr.asset_id
      LEFT JOIN fleet_vehicles fv ON fv.id = mr.vehicle_id
      LEFT JOIN vendors v ON v.id = mr.vendor_id
      LEFT JOIN employee_profiles ep ON ep.id = mr.created_by
      WHERE mr.id = $1
    `, [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Maintenance record not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { asset_id, vehicle_id, maintenance_type, category, title, description, priority, scheduled_date, vendor_id, technician_name, cost, parts_cost, labor_cost, service_interval_km, service_interval_days, notes } = req.body;
    const woNumber = await MaintenanceEngine.generateWorkOrderNumber();

    let nextServiceDate = null;
    let nextServiceOdometer = null;
    if (scheduled_date && service_interval_days) {
      nextServiceDate = new Date(scheduled_date);
      nextServiceDate.setDate(nextServiceDate.getDate() + parseInt(service_interval_days));
    }
    if (vehicle_id && service_interval_km) {
      const v = await db.query('SELECT current_mileage FROM fleet_vehicles WHERE id = $1', [vehicle_id]);
      if (v.rows[0]) nextServiceOdometer = parseInt(v.rows[0].current_mileage) + parseInt(service_interval_km);
    }

    const result = await db.query(
      `INSERT INTO maintenance_records (maintenance_number, asset_id, vehicle_id, maintenance_type, category, title, description, priority, scheduled_date, vendor_id, technician_name, cost, parts_cost, labor_cost, service_interval_km, service_interval_days, next_service_date, next_service_odometer, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING *`,
      [woNumber, asset_id || null, vehicle_id || null, maintenance_type, category, title, description, priority, scheduled_date, vendor_id || null, technician_name, cost || 0, parts_cost || 0, labor_cost || 0, service_interval_km || null, service_interval_days || null, nextServiceDate, nextServiceOdometer, 'pending', req.user.employeeId]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { title, description, priority, scheduled_date, vendor_id, technician_name, cost, parts_cost, labor_cost, notes } = req.body;
    const result = await db.query(
      `UPDATE maintenance_records SET title = COALESCE($1, title), description = COALESCE($2, description), priority = COALESCE($3, priority), scheduled_date = COALESCE($4, scheduled_date), vendor_id = COALESCE($5, vendor_id), technician_name = COALESCE($6, technician_name), cost = COALESCE($7, cost), parts_cost = COALESCE($8, parts_cost), labor_cost = COALESCE($9, labor_cost), notes = COALESCE($10, notes), updated_at = CURRENT_TIMESTAMP WHERE id = $11 RETURNING *`,
      [title, description, priority, scheduled_date, vendor_id, technician_name, cost, parts_cost, labor_cost, notes, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Maintenance record not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { status, result_notes, completion_date } = req.body;
    const updates = [`status = $1`, `updated_at = CURRENT_TIMESTAMP`];
    const params = [status];
    let idx = 1;

    if (result_notes) { idx++; updates.push(`result_notes = $${idx}`); params.push(result_notes); }
    if (completion_date) { idx++; updates.push(`completion_date = $${idx}`); params.push(completion_date); }
    if (status === 'completed' && !completion_date) { idx++; updates.push(`completion_date = CURRENT_DATE`); }

    idx++;
    params.push(req.params.id);
    const result = await db.query(`UPDATE maintenance_records SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`, params);

    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Maintenance record not found' });

    if (status === 'completed' && result.rows[0].vehicle_id) {
      await db.query('UPDATE fleet_vehicles SET last_service_mileage = current_mileage, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [result.rows[0].vehicle_id]);
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.approve = async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE maintenance_records SET approval_status = 'approved', approved_by = $1, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [req.user.employeeId, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Maintenance record not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getOverdue = async (req, res) => {
  try {
    const data = await MaintenanceEngine.getOverdueMaintenance();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getUpcoming = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const data = await MaintenanceEngine.getUpcomingMaintenance(days);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getServiceAlerts = async (req, res) => {
  try {
    const data = await MaintenanceEngine.getVehicleServiceAlerts();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getCosts = async (req, res) => {
  try {
    const { from_date, to_date } = req.query;
    const fd = from_date || `${new Date().getFullYear()}-01-01`;
    const td = to_date || new Date().toISOString().split('T')[0];
    const data = await MaintenanceEngine.getMaintenanceCosts(fd, td);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
