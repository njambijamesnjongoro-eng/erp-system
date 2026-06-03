const db = require('../../config/db');
const AnalyticsEngine = require('../../services/analyticsEngine');

exports.getExecutiveSummary = async (req, res) => {
  try {
    const roleName = req.user?.role_name;
    const departmentId = req.query.department_id || null;
    const data = await AnalyticsEngine.getExecutiveSummary(roleName, departmentId);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getEmployeeStats = async (req, res) => {
  try {
    const departmentId = req.query.department_id || null;
    const period = req.query.period || '2026';
    const [employeeCount, departmentHeadcount, turnover, attendance] = await Promise.all([
      AnalyticsEngine.getEmployeeCount(departmentId),
      AnalyticsEngine.getDepartmentHeadcount(),
      AnalyticsEngine.getEmployeeTurnoverRate(period),
      AnalyticsEngine.getAttendanceRate(null, departmentId),
    ]);
    res.json({
      success: true,
      data: {
        employee_count: employeeCount,
        department_headcount: departmentHeadcount,
        turnover,
        attendance,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getFinancialStats = async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 6;
    const [revenueTrends, payrollSummary, expenseDistribution, budgetUtilization] = await Promise.all([
      AnalyticsEngine.getMonthlyRevenue(months),
      AnalyticsEngine.getPayrollSummary(),
      AnalyticsEngine.getExpenseDistribution(),
      AnalyticsEngine.getBudgetUtilization(req.query.department_id || null),
    ]);
    res.json({
      success: true,
      data: {
        revenue_trends: revenueTrends,
        payroll_summary: payrollSummary,
        expense_distribution: expenseDistribution,
        budget_utilization: budgetUtilization,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAssetStats = async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 12;
    const [assetCounts, depreciation, maintenanceCosts] = await Promise.all([
      AnalyticsEngine.getAssetStats(),
      AnalyticsEngine.getAssetDepreciationTotal(),
      AnalyticsEngine.getMaintenanceCosts(months),
    ]);
    res.json({
      success: true,
      data: {
        asset_counts: assetCounts,
        depreciation,
        maintenance_costs: maintenanceCosts,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getProcurementStats = async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 6;
    const [spending, inventoryValue, supplierPerformance] = await Promise.all([
      AnalyticsEngine.getProcurementSpending(months),
      AnalyticsEngine.getInventoryValue(),
      AnalyticsEngine.getSupplierPerformance(),
    ]);
    res.json({
      success: true,
      data: {
        procurement_spending: spending,
        inventory_value: inventoryValue,
        supplier_performance: supplierPerformance,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getComplianceStats = async (req, res) => {
  try {
    const compliance = await AnalyticsEngine.getComplianceScore();
    const records = await db.query(
      `SELECT cr.*, d.name AS department_name
       FROM compliance_records cr
       LEFT JOIN departments d ON cr.entity_type = 'department' AND cr.entity_id = d.id
       ORDER BY cr.due_date ASC`
    );
    res.json({
      success: true,
      data: {
        summary: compliance,
        records: records.rows,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getKpiCards = async (req, res) => {
  try {
    const [
      employeeCount,
      pendingApprovals,
      revenueResult,
      systemHealthResult,
    ] = await Promise.all([
      db.query("SELECT COUNT(*)::int AS count FROM employee_profiles WHERE employment_status = 'active'"),
      AnalyticsEngine.getPendingApprovals(),
      db.query(
        `SELECT COALESCE(SUM(credit), 0) AS total
         FROM financial_transactions
         WHERE DATE_TRUNC('month', transaction_date) = DATE_TRUNC('month', CURRENT_DATE)`
      ),
      db.query(
        `WITH counts AS (
          SELECT COUNT(*)::int AS total FROM system_logs
          WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
        ),
        errors AS (
          SELECT COUNT(*)::int AS count FROM system_logs
          WHERE level IN ('error','critical') AND created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
        )
        SELECT CASE WHEN counts.total > 0
          THEN ROUND(((counts.total - errors.count)::numeric / counts.total) * 100, 1)
          ELSE 100 END AS health_score
        FROM counts, errors`
      ),
    ]);

    res.json({
      success: true,
      data: {
        employee_count: parseInt(employeeCount.rows[0].count),
        pending_approvals: pendingApprovals,
        monthly_revenue: parseFloat(revenueResult.rows[0].total),
        system_health: parseInt(systemHealthResult.rows[0].health_score),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getWidgetData = async (req, res) => {
  try {
    const { widget_type } = req.query;
    let data;

    switch (widget_type) {
      case 'kpi_card':
        data = await db.query(
          `SELECT
            (SELECT COUNT(*)::int FROM employee_profiles WHERE employment_status = 'active') AS employee_count,
            (SELECT COALESCE(SUM(credit), 0) FROM financial_transactions
              WHERE DATE_TRUNC('month', transaction_date) = DATE_TRUNC('month', CURRENT_DATE)) AS monthly_revenue,
            (SELECT COUNT(*)::int FROM procurement_approvals WHERE status = 'pending') AS pending_approvals`
        );
        data = data.rows[0];
        break;
      case 'bar_chart':
        data = await db.query(
          `SELECT d.name AS label,
            COALESCE(SUM(po.total_amount), 0) AS value
           FROM departments d
           LEFT JOIN procurement_requests pr ON pr.department_id = d.id
           LEFT JOIN purchase_orders po ON po.request_id = pr.id AND po.status NOT IN ('draft','cancelled')
           GROUP BY d.id, d.name
           ORDER BY value DESC`
        );
        data = data.rows;
        break;
      case 'line_chart':
        data = await db.query(
          `SELECT EXTRACT(MONTH FROM transaction_date)::int AS month,
            EXTRACT(YEAR FROM transaction_date)::int AS year,
            COALESCE(SUM(credit), 0) AS revenue,
            COALESCE(SUM(debit), 0) AS expenses
           FROM financial_transactions
           WHERE transaction_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '6 months')
           GROUP BY year, month
           ORDER BY year, month`
        );
        data = data.rows;
        break;
      case 'pie_chart':
        data = await db.query(
          `SELECT ac.category_name AS label,
            COUNT(*)::int AS value
           FROM assets a
           JOIN asset_categories ac ON a.category_id = ac.id
           WHERE a.lifecycle_status = 'active'
           GROUP BY ac.category_name
           ORDER BY value DESC`
        );
        data = data.rows;
        break;
      case 'table':
        data = await db.query(
          `SELECT pr.id, pr.request_number, pr.title, pr.status,
            ep.full_name AS requester,
            d.name AS department,
            pr.created_at
           FROM procurement_requests pr
           JOIN employee_profiles ep ON pr.requester_id = ep.id
           JOIN departments d ON pr.department_id = d.id
           ORDER BY pr.created_at DESC LIMIT 20`
        );
        data = data.rows;
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid widget_type' });
    }

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.saveWidgetConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const { widget_type, config, position, size, title } = req.body;

    if (id) {
      const existing = await db.query('SELECT id FROM dashboard_widgets WHERE id = $1 AND user_id = $2', [id, req.user.id]);
      if (existing.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Widget not found' });
      }
      const result = await db.query(
        `UPDATE dashboard_widgets
         SET widget_type = COALESCE($1, widget_type),
             config = COALESCE($2, config),
             position = COALESCE($3, position),
             size = COALESCE($4, size),
             title = COALESCE($5, title),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $6 AND user_id = $7
         RETURNING *`,
        [widget_type, config ? JSON.stringify(config) : null, position, size, title, id, req.user.id]
      );
      return res.json({ success: true, data: result.rows[0] });
    }

    const result = await db.query(
      `INSERT INTO dashboard_widgets (user_id, widget_type, config, position, size, title)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user.id, widget_type, JSON.stringify(config || {}), position || 0, size || 'medium', title || '']
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getWidgets = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM dashboard_widgets WHERE user_id = $1 ORDER BY position ASC`,
      [req.user.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteWidget = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      'DELETE FROM dashboard_widgets WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Widget not found' });
    }
    res.json({ success: true, message: 'Widget deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
