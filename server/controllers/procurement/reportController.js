const db = require('../../config/db');
const InventoryEngine = require('../../services/inventoryEngine');
const { sendPdfReport } = require('../../utils/pdfReport');

const buildOverview = async () => {
  const pendingRequests = await db.query("SELECT COUNT(*)::int count FROM procurement_requests WHERE status = 'pending'");
  const approvedRequests = await db.query("SELECT COUNT(*)::int count FROM procurement_requests WHERE status = 'approved'");
  const totalPoValue = await db.query("SELECT COALESCE(SUM(total_amount), 0) total FROM purchase_orders WHERE status NOT IN ('cancelled', 'draft')");
  const activeSuppliers = await db.query("SELECT COUNT(*)::int count FROM procurement_suppliers WHERE status = 'active'");
  const lowStockItems = await InventoryEngine.getLowStockItems();
  const overdueDeliveries = await db.query("SELECT COUNT(*)::int count FROM purchase_orders WHERE expected_delivery_date < CURRENT_DATE AND status IN ('sent', 'partially_received')");
  const pendingApprovals = await db.query("SELECT COUNT(*)::int count FROM procurement_approvals WHERE status = 'pending'");
  const trend = await db.query(`SELECT EXTRACT(MONTH FROM po.order_date)::int AS report_month, COALESCE(SUM(po.total_amount), 0) total
              FROM purchase_orders po
              WHERE EXTRACT(YEAR FROM po.order_date) = EXTRACT(YEAR FROM CURRENT_DATE)
              AND po.status NOT IN ('cancelled', 'draft')
              GROUP BY 1 ORDER BY 1`);
  const departmentSpend = await db.query(`SELECT d.name department, COALESCE(SUM(po.total_amount), 0) total
              FROM departments d
              LEFT JOIN procurement_requests pr ON pr.department_id = d.id
              LEFT JOIN purchase_orders po ON po.request_id = pr.id AND po.status NOT IN ('cancelled', 'draft')
              GROUP BY d.id, d.name ORDER BY total DESC`);

  return {
    title: 'Procurement Overview Report',
    filename: 'procurement-overview.pdf',
    summary: [
      { label: 'Pending Requests', value: pendingRequests.rows[0].count },
      { label: 'Approved Requests', value: approvedRequests.rows[0].count },
      { label: 'Total PO Value', value: totalPoValue.rows[0].total, type: 'currency' },
      { label: 'Active Suppliers', value: activeSuppliers.rows[0].count },
      { label: 'Low Stock Items', value: lowStockItems.length },
      { label: 'Overdue Deliveries', value: overdueDeliveries.rows[0].count },
      { label: 'Pending Approvals', value: pendingApprovals.rows[0].count },
    ],
    sections: [
      {
        title: 'Monthly Procurement Trend',
        columns: [
          { key: 'report_month', label: 'Month', width: 120 },
          { key: 'total', label: 'Total', type: 'currency', width: 160 },
        ],
        rows: trend.rows,
      },
      {
        title: 'Department Spending',
        columns: [
          { key: 'department', label: 'Department', width: 220 },
          { key: 'total', label: 'Total', type: 'currency', width: 160 },
        ],
        rows: departmentSpend.rows,
      },
    ],
  };
};

const buildStock = async () => {
  const [lowStock, value] = await Promise.all([
    InventoryEngine.getLowStockItems(),
    InventoryEngine.getStockValue(),
  ]);
  return {
    title: 'Stock Report',
    filename: 'procurement-stock-report.pdf',
    summary: [
      { label: 'Total Stock Value', value: value.total_value || 0, type: 'currency' },
      { label: 'Low Stock Items', value: lowStock.length },
      { label: 'Total In', value: value.total_in || 0 },
      { label: 'Total Out', value: value.total_out || 0 },
    ],
    sections: [{
      title: 'Low Stock Items',
      columns: [
        { key: 'item_name', label: 'Item', width: 180 },
        { key: 'item_code', label: 'Code', width: 100 },
        { key: 'current_stock', label: 'Current', width: 80 },
        { key: 'reorder_point', label: 'Reorder At', width: 80 },
        { key: 'warehouse_name', label: 'Warehouse', width: 120 },
      ],
      rows: lowStock,
    }],
  };
};

const buildSupplier = async () => {
  const [top, expiring] = await Promise.all([
    db.query(`SELECT ps.supplier_name, COUNT(po.id)::int order_count, COALESCE(SUM(po.total_amount), 0) total_spent, COALESCE(AVG(ps.rating),0) avg_rating
              FROM procurement_suppliers ps
              LEFT JOIN purchase_orders po ON po.supplier_id = ps.id AND po.status NOT IN ('cancelled', 'draft')
              GROUP BY ps.id, ps.supplier_name
              ORDER BY total_spent DESC, ps.supplier_name
              LIMIT 20`),
    db.query(`SELECT ps.supplier_name, sc.contract_number, sc.start_date, sc.end_date, sc.status
              FROM supplier_contracts sc
              JOIN procurement_suppliers ps ON ps.id = sc.supplier_id
              WHERE sc.end_date <= CURRENT_DATE + INTERVAL '90 days'
              ORDER BY sc.end_date ASC
              LIMIT 25`),
  ]);
  return {
    title: 'Supplier Report',
    filename: 'procurement-supplier-report.pdf',
    sections: [
      {
        title: 'Top Suppliers',
        columns: [
          { key: 'supplier_name', label: 'Supplier', width: 210 },
          { key: 'total_spent', label: 'Spend', type: 'currency', width: 130 },
          { key: 'order_count', label: 'Orders', width: 80 },
          { key: 'avg_rating', label: 'Rating', width: 80 },
        ],
        rows: top.rows,
      },
      {
        title: 'Contracts Expiring In 90 Days',
        columns: [
          { key: 'supplier_name', label: 'Supplier', width: 170 },
          { key: 'contract_number', label: 'Contract', width: 120 },
          { key: 'start_date', label: 'Start', type: 'date', width: 90 },
          { key: 'end_date', label: 'End', type: 'date', width: 90 },
          { key: 'status', label: 'Status', width: 80 },
        ],
        rows: expiring.rows,
      },
    ],
  };
};

const buildSpend = async () => {
  const [department, category, monthly] = await Promise.all([
    db.query(`SELECT d.name department, COALESCE(SUM(po.total_amount), 0) total
              FROM departments d
              LEFT JOIN procurement_requests pr ON pr.department_id = d.id
              LEFT JOIN purchase_orders po ON po.request_id = pr.id AND po.status NOT IN ('cancelled', 'draft')
              GROUP BY d.id, d.name ORDER BY total DESC`),
    db.query(`SELECT pc.category_name category, COALESCE(SUM(pr.total_estimated_cost),0) total, COUNT(pr.id)::int request_count
              FROM procurement_categories pc
              LEFT JOIN procurement_requests pr ON pr.category_id = pc.id
              GROUP BY pc.id, pc.category_name
              ORDER BY total DESC`),
    db.query(`SELECT EXTRACT(MONTH FROM po.order_date)::int AS report_month, COALESCE(SUM(po.total_amount), 0) total
              FROM purchase_orders po
              WHERE EXTRACT(YEAR FROM po.order_date) = EXTRACT(YEAR FROM CURRENT_DATE)
              AND po.status NOT IN ('cancelled', 'draft')
              GROUP BY 1 ORDER BY 1`),
  ]);
  return {
    title: 'Spend Analysis Report',
    filename: 'procurement-spend-analysis.pdf',
    sections: [
      {
        title: 'Department Spend',
        columns: [
          { key: 'department', label: 'Department', width: 220 },
          { key: 'total', label: 'Total', type: 'currency', width: 160 },
        ],
        rows: department.rows,
      },
      {
        title: 'Category Spend',
        columns: [
          { key: 'category', label: 'Category', width: 220 },
          { key: 'request_count', label: 'Requests', width: 90 },
          { key: 'total', label: 'Total', type: 'currency', width: 160 },
        ],
        rows: category.rows,
      },
      {
        title: 'Monthly Spend',
        columns: [
          { key: 'report_month', label: 'Month', width: 120 },
          { key: 'total', label: 'Total', type: 'currency', width: 160 },
        ],
        rows: monthly.rows,
      },
    ],
  };
};

exports.download = async (req, res) => {
  try {
    const builders = {
      overview: buildOverview,
      stock: buildStock,
      supplier: buildSupplier,
      spend: buildSpend,
    };
    const build = builders[req.params.type];
    if (!build) return res.status(404).json({ success: false, message: 'Unknown procurement report type' });
    const report = await build(req.query);
    return sendPdfReport(res, {
      subtitle: `Prepared for ${req.user.email}`,
      ...report,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
