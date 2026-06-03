const db = require('../config/db');

class MaintenanceEngine {
  static async getOverdueMaintenance() {
    const result = await db.query(`
      SELECT mr.*, a.asset_name, a.asset_code, fv.registration_number, fv.vehicle_code
      FROM maintenance_records mr
      LEFT JOIN assets a ON a.id = mr.asset_id
      LEFT JOIN fleet_vehicles fv ON fv.id = mr.vehicle_id
      WHERE mr.status IN ('pending', 'in_progress')
      AND mr.scheduled_date < CURRENT_DATE
      ORDER BY mr.scheduled_date ASC
    `);
    return result.rows;
  }

  static async getUpcomingMaintenance(daysAhead = 30) {
    const result = await db.query(`
      SELECT mr.*, a.asset_name, a.asset_code, fv.registration_number, fv.vehicle_code
      FROM maintenance_records mr
      LEFT JOIN assets a ON a.id = mr.asset_id
      LEFT JOIN fleet_vehicles fv ON fv.id = mr.vehicle_id
      WHERE mr.status IN ('pending', 'scheduled')
      AND mr.scheduled_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '1 day' * $1
      ORDER BY mr.scheduled_date ASC
    `, [daysAhead]);
    return result.rows;
  }

  static async getVehicleServiceAlerts() {
    const result = await db.query(`
      SELECT fv.*, 
        (fv.current_mileage - fv.last_service_mileage) as km_since_service,
        (mr.next_service_date) as next_service_date,
        (mr.next_service_odometer) as next_service_km
      FROM fleet_vehicles fv
      LEFT JOIN LATERAL (
        SELECT next_service_date, next_service_odometer FROM maintenance_records 
        WHERE vehicle_id = fv.id AND maintenance_type = 'preventive' 
        ORDER BY created_at DESC LIMIT 1
      ) mr ON true
      WHERE fv.status = 'active'
      AND (
        (fv.current_mileage - fv.last_service_mileage) > 5000
        OR (mr.next_service_date IS NOT NULL AND mr.next_service_date <= CURRENT_DATE + INTERVAL '7 days')
        OR (mr.next_service_odometer IS NOT NULL AND fv.current_mileage >= mr.next_service_odometer)
      )
    `);
    return result.rows;
  }

  static async getMaintenanceCosts(dateFrom, dateTo) {
    const result = await db.query(`
      SELECT 
        COALESCE(SUM(cost), 0) as total_cost,
        COALESCE(SUM(parts_cost), 0) as total_parts,
        COALESCE(SUM(labor_cost), 0) as total_labor,
        COUNT(*) as total_work_orders,
        AVG(cost) as avg_cost
      FROM maintenance_records
      WHERE status = 'completed'
      AND completion_date BETWEEN $1 AND $2
    `, [dateFrom, dateTo]);
    return result.rows[0];
  }

  static async generateWorkOrderNumber() {
    const seq = await db.query("SELECT COALESCE(MAX(SUBSTRING(maintenance_number FROM 'WO-(\\d+)')::int), 0) + 1 as next FROM maintenance_records");
    const num = parseInt(seq.rows[0].next);
    return `WO-${String(num).padStart(6, '0')}`;
  }

  static async checkWarrantyExpiry() {
    const result = await db.query(`
      SELECT id, asset_name, asset_code, warranty_expiry, assigned_to
      FROM assets 
      WHERE warranty_expiry IS NOT NULL 
      AND warranty_expiry BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
      AND lifecycle_status = 'active'
    `);
    return result.rows;
  }

  static async checkInsuranceExpiry() {
    const result = await db.query(`
      SELECT aip.*, a.asset_name, a.asset_code, fv.registration_number
      FROM asset_insurance_policies aip
      LEFT JOIN assets a ON a.id = aip.asset_id
      LEFT JOIN fleet_vehicles fv ON fv.id = aip.vehicle_id
      WHERE aip.status = 'active'
      AND aip.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
    `);
    return result.rows;
  }

  static getServiceIntervalRecommendation(vehicleType) {
    const intervals = {
      car: { km: 5000, days: 180 },
      suv: { km: 5000, days: 180 },
      truck: { km: 10000, days: 90 },
      motorcycle: { km: 3000, days: 90 },
      default: { km: 5000, days: 180 },
    };
    return intervals[vehicleType?.toLowerCase()] || intervals.default;
  }
}

module.exports = MaintenanceEngine;
