const db = require('../../config/db');
const MaintenanceEngine = require('../../services/maintenanceEngine');

exports.getDashboardStats = async (req, res) => {
  try {
    const [assetCounts, valueStats, categoryStats, statusStats, fleetStats, maintenanceStats, insuranceStats, alerts] = await Promise.all([
      db.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'available') as available,
          COUNT(*) FILTER (WHERE status = 'assigned') as assigned,
          COUNT(*) FILTER (WHERE status = 'in_maintenance') as in_maintenance,
          COUNT(*) FILTER (WHERE lifecycle_status = 'active') as active,
          COUNT(*) FILTER (WHERE lifecycle_status = 'disposed') as disposed
        FROM assets
      `),
      db.query('SELECT COALESCE(SUM(purchase_cost),0) as total_cost, COALESCE(SUM(current_value),0) as current_value, COALESCE(SUM(accumulated_depreciation),0) as total_depreciation FROM assets WHERE lifecycle_status = \'active\''),
      db.query(`
        SELECT ac.category_name, COUNT(*) as count, COALESCE(SUM(a.current_value),0) as total_value
        FROM assets a JOIN asset_categories ac ON ac.id = a.category_id
        WHERE a.lifecycle_status = 'active'
        GROUP BY ac.category_name ORDER BY count DESC
      `),
      db.query("SELECT status, COUNT(*) as count FROM assets WHERE lifecycle_status = 'active' GROUP BY status"),
      db.query(`
        SELECT COUNT(*) as total_vehicles, COUNT(*) FILTER (WHERE status='active') as active_vehicles,
          COALESCE(SUM(current_mileage),0) as total_mileage, COALESCE(AVG(current_mileage),0) as avg_mileage
        FROM fleet_vehicles
      `),
      db.query(`
        SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status='pending') as pending,
          COUNT(*) FILTER (WHERE status='in_progress') as in_progress,
          COUNT(*) FILTER (WHERE status='overdue' OR (status='pending' AND scheduled_date < CURRENT_DATE)) as overdue,
          COALESCE(SUM(cost),0) as total_cost
        FROM maintenance_records
        WHERE created_at >= date_trunc('year', CURRENT_DATE)
      `),
      db.query(`
        SELECT COUNT(*) as total_policies, COUNT(*) FILTER (WHERE status='active') as active_policies,
          COUNT(*) FILTER (WHERE status='active' AND end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days') as expiring_soon,
          COALESCE(SUM(premium_amount),0) as total_premium
        FROM asset_insurance_policies
      `),
      MaintenanceEngine.getOverdueMaintenance(),
    ]);

    res.json({
      success: true,
      data: {
        assets: assetCounts.rows[0],
        values: valueStats.rows[0],
        byCategory: categoryStats.rows,
        byStatus: statusStats.rows,
        fleet: fleetStats.rows[0],
        maintenance: maintenanceStats.rows[0],
        insurance: insuranceStats.rows[0],
        overdueAlerts: alerts,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
