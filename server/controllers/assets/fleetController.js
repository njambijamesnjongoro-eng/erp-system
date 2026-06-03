const db = require('../../config/db');

exports.listVehicles = async (req, res) => {
  try {
    const { status, department_id, driver_id } = req.query;
    let query = `
      SELECT fv.*, d.name as department_name,
        ep.full_name as driver_name,
        aip.policy_number, aip.end_date as insurance_expiry
      FROM fleet_vehicles fv
      LEFT JOIN departments d ON d.id = fv.department_id
      LEFT JOIN employee_profiles ep ON ep.id = fv.assigned_driver
      LEFT JOIN asset_insurance_policies aip ON aip.vehicle_id = fv.id AND aip.status = 'active'
      WHERE 1=1
    `;
    const params = [];
    if (status) { params.push(status); query += ` AND fv.status = $${params.length}`; }
    if (department_id) { params.push(department_id); query += ` AND fv.department_id = $${params.length}`; }
    if (driver_id) { params.push(driver_id); query += ` AND fv.assigned_driver = $${params.length}`; }
    query += ' ORDER BY fv.created_at DESC';
    const result = await db.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getVehicleById = async (req, res) => {
  try {
    const vehicle = await db.query(`
      SELECT fv.*, d.name as department_name, ep.full_name as driver_name
      FROM fleet_vehicles fv
      LEFT JOIN departments d ON d.id = fv.department_id
      LEFT JOIN employee_profiles ep ON ep.id = fv.assigned_driver
      WHERE fv.id = $1
    `, [req.params.id]);
    if (!vehicle.rows[0]) return res.status(404).json({ success: false, message: 'Vehicle not found' });
    const [fuel, trips, maintenance, insurance] = await Promise.all([
      db.query('SELECT * FROM fuel_logs WHERE vehicle_id = $1 ORDER BY fuel_date DESC LIMIT 20', [req.params.id]),
      db.query('SELECT * FROM trip_logs WHERE vehicle_id = $1 ORDER BY trip_date DESC LIMIT 20', [req.params.id]),
      db.query('SELECT * FROM maintenance_records WHERE vehicle_id = $1 ORDER BY created_at DESC LIMIT 10', [req.params.id]),
      db.query('SELECT * FROM asset_insurance_policies WHERE vehicle_id = $1 ORDER BY created_at DESC', [req.params.id]),
    ]);
    res.json({ success: true, data: { ...vehicle.rows[0], fuelLogs: fuel.rows, trips: trips.rows, maintenance: maintenance.rows, insurance: insurance.rows } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createVehicle = async (req, res) => {
  try {
    const { registration_number, vehicle_type, make, model, year, color, chassis_number, engine_number, fuel_type, tank_capacity, seating_capacity, department_id, purchase_cost, notes } = req.body;
    const code = `VEH-${registration_number.replace(/[^A-Z0-9]/g, '')}`;
    const result = await db.query(
      `INSERT INTO fleet_vehicles (vehicle_code, registration_number, vehicle_type, make, model, year, color, chassis_number, engine_number, fuel_type, tank_capacity, seating_capacity, department_id, purchase_cost, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [code, registration_number, vehicle_type, make, model, year, color, chassis_number, engine_number, fuel_type, tank_capacity, seating_capacity, department_id, purchase_cost, notes]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateVehicle = async (req, res) => {
  try {
    const allowed = ['registration_number', 'vehicle_type', 'make', 'model', 'year', 'color', 'fuel_type', 'tank_capacity', 'seating_capacity', 'department_id', 'assigned_driver', 'status', 'condition', 'location', 'current_mileage', 'notes'];
    const updates = [];
    const params = [];
    let idx = 0;
    for (const field of allowed) {
      if (req.body[field] !== undefined) {
        idx++;
        updates.push(`${field} = $${idx}`);
        params.push(req.body[field]);
      }
    }
    if (updates.length === 0) return res.status(400).json({ success: false, message: 'No fields to update' });
    idx++;
    params.push(req.params.id);
    const result = await db.query(`UPDATE fleet_vehicles SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx} RETURNING *`, params);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.addFuelLog = async (req, res) => {
  try {
    const { liters, cost_per_liter, total_cost, odometer_reading, fuel_station, receipt_number, fuel_type, payment_method, notes } = req.body;
    const result = await db.query(
      `INSERT INTO fuel_logs (vehicle_id, driver_id, fuel_date, liters, cost_per_liter, total_cost, odometer_reading, fuel_station, receipt_number, fuel_type, payment_method, notes)
       VALUES ($1,$2,CURRENT_DATE,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [req.params.id, req.user.employeeId, liters, cost_per_liter, total_cost, odometer_reading, fuel_station, receipt_number, fuel_type, payment_method, notes]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getFuelLogs = async (req, res) => {
  try {
    const { vehicle_id, from_date, to_date } = req.query;
    let query = 'SELECT fl.*, ep.full_name as driver_name FROM fuel_logs fl LEFT JOIN employee_profiles ep ON ep.id=fl.driver_id WHERE 1=1';
    const params = [];
    if (vehicle_id) { params.push(vehicle_id); query += ` AND fl.vehicle_id = $${params.length}`; }
    if (from_date) { params.push(from_date); query += ` AND fl.fuel_date >= $${params.length}`; }
    if (to_date) { params.push(to_date); query += ` AND fl.fuel_date <= $${params.length}`; }
    query += ' ORDER BY fl.fuel_date DESC LIMIT 100';
    const result = await db.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.addTrip = async (req, res) => {
  try {
    const { start_location, end_location, purpose, start_odometer, end_odometer, notes } = req.body;
    const distance = (end_odometer || 0) - (start_odometer || 0);
    const result = await db.query(
      `INSERT INTO trip_logs (vehicle_id, driver_id, trip_date, start_location, end_location, purpose, start_odometer, end_odometer, distance_km, status)
       VALUES ($1,$2,CURRENT_DATE,$3,$4,$5,$6,$7,$8,'approved') RETURNING *`,
      [req.params.id, req.user.employeeId, start_location, end_location, purpose, start_odometer, end_odometer, distance]
    );

    await db.query('UPDATE fleet_vehicles SET current_mileage = GREATEST(current_mileage, $1) WHERE id = $2',
      [end_odometer || start_odometer, req.params.id]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getTrips = async (req, res) => {
  try {
    const { vehicle_id, from_date, to_date } = req.query;
    let query = 'SELECT tl.*, ep.full_name as driver_name FROM trip_logs tl LEFT JOIN employee_profiles ep ON ep.id=tl.driver_id WHERE 1=1';
    const params = [];
    if (vehicle_id) { params.push(vehicle_id); query += ` AND tl.vehicle_id = $${params.length}`; }
    if (from_date) { params.push(from_date); query += ` AND tl.trip_date >= $${params.length}`; }
    if (to_date) { params.push(to_date); query += ` AND tl.trip_date <= $${params.length}`; }
    query += ' ORDER BY tl.trip_date DESC LIMIT 100';
    const result = await db.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getFuelAnalytics = async (req, res) => {
  try {
    const { vehicle_id, months = 6 } = req.query;
    const m = parseInt(months);
    const result = await db.query(`
      SELECT 
        to_char(fl.fuel_date, 'YYYY-MM') as month,
        fv.registration_number,
        fv.vehicle_code,
        COUNT(*) as refuels,
        COALESCE(SUM(fl.liters), 0) as total_liters,
        COALESCE(SUM(fl.total_cost), 0) as total_cost,
        COALESCE(AVG(fl.cost_per_liter), 0) as avg_cost_per_liter
      FROM fuel_logs fl
      JOIN fleet_vehicles fv ON fv.id = fl.vehicle_id
      WHERE fl.fuel_date >= CURRENT_DATE - INTERVAL '1 month' * $1
      ${vehicle_id ? ' AND fl.vehicle_id = $2' : ''}
      GROUP BY month, fv.registration_number, fv.vehicle_code
      ORDER BY month DESC
    `, vehicle_id ? [m, vehicle_id] : [m]);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMileageAnalytics = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT fv.registration_number, fv.vehicle_code, fv.make, fv.model, fv.current_mileage,
        fv.last_service_mileage, (fv.current_mileage - fv.last_service_mileage) as km_since_service
      FROM fleet_vehicles fv
      WHERE fv.status = 'active'
      ORDER BY km_since_service DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
