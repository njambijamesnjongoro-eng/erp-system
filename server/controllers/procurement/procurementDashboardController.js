const db = require('../../config/db');
const InventoryEngine = require('../../services/inventoryEngine');

exports.getStats = async (req, res) => {
  try {
    const [
      pendingRequests,
      approvedRequests,
      totalPoValue,
      activeSuppliers,
      inventoryValue,
      lowStockItems,
      overdueDeliveries,
      pendingApprovals
    ] = await Promise.all([
      db.query("SELECT COUNT(*)::int as count FROM procurement_requests WHERE status = 'pending'"),
      db.query("SELECT COUNT(*)::int as count FROM procurement_requests WHERE status = 'approved'"),
      db.query("SELECT COALESCE(SUM(total_amount), 0) as total FROM purchase_orders WHERE status NOT IN ('cancelled', 'draft')"),
      db.query("SELECT COUNT(*)::int as count FROM procurement_suppliers WHERE status = 'active'"),
      InventoryEngine.getStockValue(),
      InventoryEngine.getLowStockItems(),
      db.query("SELECT COUNT(*)::int as count FROM purchase_orders WHERE expected_delivery_date < CURRENT_DATE AND status IN ('sent', 'partially_received')"),
      db.query("SELECT COUNT(*)::int as count FROM procurement_approvals WHERE status = 'pending'")
    ]);

    res.json({
      success: true,
      data: {
        pending_requests: parseInt(pendingRequests.rows[0].count),
        approved_requests: parseInt(approvedRequests.rows[0].count),
        total_po_value: parseFloat(totalPoValue.rows[0].total),
        active_suppliers: parseInt(activeSuppliers.rows[0].count),
        inventory_value: inventoryValue,
        low_stock_count: lowStockItems.length,
        overdue_deliveries: parseInt(overdueDeliveries.rows[0].count),
        pending_approvals: parseInt(pendingApprovals.rows[0].count)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getRequestsByStatus = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT status, COUNT(*)::int as count
       FROM procurement_requests
       GROUP BY status
       ORDER BY status`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getSpendingByDepartment = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT d.name, COALESCE(SUM(po.total_amount), 0) as total
       FROM departments d
       LEFT JOIN procurement_requests pr ON pr.department_id = d.id
       LEFT JOIN purchase_orders po ON po.request_id = pr.id AND po.status NOT IN ('cancelled', 'draft')
       GROUP BY d.id, d.name
       ORDER BY total DESC`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMonthlyProcurementTrend = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT EXTRACT(MONTH FROM po.order_date)::int as month,
       COALESCE(SUM(po.total_amount), 0) as total
       FROM purchase_orders po
       WHERE EXTRACT(YEAR FROM po.order_date) = EXTRACT(YEAR FROM CURRENT_DATE)
       AND po.status NOT IN ('cancelled', 'draft')
       GROUP BY month
       ORDER BY month`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getTopSuppliers = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT ps.supplier_name, ps.id, COUNT(po.id)::int as order_count,
       COALESCE(SUM(po.total_amount), 0) as total_spent
       FROM procurement_suppliers ps
       JOIN purchase_orders po ON po.supplier_id = ps.id AND po.status NOT IN ('cancelled', 'draft')
       GROUP BY ps.id, ps.supplier_name
       ORDER BY total_spent DESC
       LIMIT 10`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getPendingApprovalsCount = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT pa.approver_role, COUNT(*)::int as count
       FROM procurement_approvals pa
       WHERE pa.status = 'pending'
       GROUP BY pa.approver_role`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
