const db = require('../config/db');

class AnalyticsEngine {
  static async getEmployeeCount(departmentId = null) {
    let sql = `SELECT COUNT(*)::int AS count FROM employee_profiles WHERE employment_status = 'active'`;
    const params = [];
    if (departmentId) {
      sql += ` AND department_id = $1`;
      params.push(departmentId);
    }
    const result = await db.query(sql, params);
    return result.rows[0].count;
  }

  static async getDepartmentHeadcount() {
    const result = await db.query(
      `SELECT d.name AS department_name, COUNT(ep.id)::int AS employee_count
       FROM departments d
       LEFT JOIN employee_profiles ep ON ep.department_id = d.id AND ep.employment_status = 'active'
       GROUP BY d.id, d.name
       ORDER BY d.name`
    );
    return result.rows;
  }

  static async getEmployeeTurnoverRate(period = '2026') {
    const result = await db.query(
      `SELECT
        COUNT(*) FILTER (WHERE EXTRACT(YEAR FROM date_hired) = $1)::int AS hired_count,
        COUNT(*) FILTER (WHERE employment_status = 'terminated' AND EXTRACT(YEAR FROM updated_at) = $1)::int AS terminated_count,
        COUNT(*) FILTER (WHERE employment_status = 'active')::int AS total,
        CASE WHEN COUNT(*) FILTER (WHERE employment_status = 'active') > 0
          THEN ROUND((COUNT(*) FILTER (WHERE employment_status = 'terminated' AND EXTRACT(YEAR FROM updated_at) = $1)::numeric /
                NULLIF(COUNT(*) FILTER (WHERE employment_status = 'active'), 0)) * 100, 2)
          ELSE 0
        END AS turnover_rate
       FROM employee_profiles`,
      [period]
    );
    return result.rows[0];
  }

  static async getAttendanceRate(period = null, departmentId = null) {
    let sql = `SELECT
      COUNT(*) FILTER (WHERE a.status = 'present')::int AS present_days,
      COUNT(*)::int AS total_working_days,
      CASE WHEN COUNT(*) > 0
        THEN ROUND((COUNT(*) FILTER (WHERE a.status = 'present')::numeric / COUNT(*)) * 100, 2)
        ELSE 0
      END AS attendance_percentage
      FROM attendance a`;
    const params = [];
    const conditions = [];
    if (period) {
      conditions.push(`DATE_TRUNC('month', a.date) = DATE_TRUNC('month', $1::date)`);
      params.push(period);
    }
    if (departmentId) {
      conditions.push(`a.employee_id IN (SELECT id FROM employee_profiles WHERE department_id = $${params.length + 1})`);
      params.push(departmentId);
    }
    if (conditions.length > 0) {
      sql += ` WHERE ` + conditions.join(' AND ');
    }
    const result = await db.query(sql, params);
    return result.rows[0];
  }

  static async getMonthlyRevenue(months = 12) {
    const result = await db.query(
      `SELECT
        EXTRACT(MONTH FROM transaction_date)::int AS month,
        EXTRACT(YEAR FROM transaction_date)::int AS year,
        COALESCE(SUM(credit), 0) AS total_revenue,
        COALESCE(SUM(debit), 0) AS total_expenses,
        COALESCE(SUM(credit), 0) - COALESCE(SUM(debit), 0) AS net_profit
       FROM financial_transactions
       WHERE transaction_date >= DATE_TRUNC('month', CURRENT_DATE) - ($1 || ' months')::interval
       GROUP BY year, month
       ORDER BY year DESC, month DESC`,
      [months]
    );
    return result.rows;
  }

  static async getPayrollSummary(period = null) {
    let sql = `SELECT
      COALESCE(SUM(gross_pay), 0) AS total_salary,
      COALESCE(SUM(housing_allowance + transport_allowance + medical_allowance + leave_allowance + bonus + overtime_pay + other_allowances), 0) AS total_allowances,
      COALESCE(SUM(total_deductions), 0) AS total_deductions,
      COALESCE(SUM(paye_tax), 0) AS total_tax,
      COALESCE(SUM(net_pay), 0) AS total_net_pay
      FROM payroll`;
    const params = [];
    if (period) {
      sql += ` WHERE payroll_period_id IN (SELECT id FROM payroll_periods WHERE period_name = $1)`;
      params.push(period);
    }
    const result = await db.query(sql, params);
    return result.rows[0];
  }

  static async getExpenseDistribution(period = null) {
    let sql = `SELECT expense_category, COALESCE(SUM(amount), 0) AS total_amount,
      COUNT(*)::int AS expense_count
      FROM expenses`;
    const params = [];
    if (period) {
      sql += ` WHERE DATE_TRUNC('month', expense_date) = DATE_TRUNC('month', $1::date)`;
      params.push(period);
    }
    sql += ` GROUP BY expense_category ORDER BY total_amount DESC`;
    const result = await db.query(sql, params);
    return result.rows;
  }

  static async getBudgetUtilization(departmentId = null) {
    let sql = `SELECT d.name AS department_name,
      COALESCE(b.total_amount, 0) AS budget_amount,
      COALESCE(b.spent_amount, 0) AS spent_amount,
      CASE WHEN COALESCE(b.total_amount, 0) > 0
        THEN ROUND((COALESCE(b.spent_amount, 0)::numeric / b.total_amount) * 100, 2)
        ELSE 0
      END AS utilization_percentage
      FROM departments d
      LEFT JOIN budgets b ON b.department_id = d.id AND b.status = 'approved'`;
    const params = [];
    if (departmentId) {
      sql += ` WHERE d.id = $1`;
      params.push(departmentId);
    }
    sql += ` ORDER BY utilization_percentage DESC`;
    const result = await db.query(sql, params);
    return result.rows;
  }

  static async getAssetStats() {
    const result = await db.query(
      `SELECT
        COUNT(*)::int AS total_assets,
        COUNT(*) FILTER (WHERE status = 'assigned' OR lifecycle_status = 'in_use')::int AS assigned_count,
        COUNT(*) FILTER (WHERE status = 'available' AND lifecycle_status = 'active')::int AS available_count,
        COUNT(*) FILTER (WHERE status = 'under_maintenance')::int AS under_maintenance_count,
        COUNT(*) FILTER (WHERE lifecycle_status = 'disposed')::int AS disposed_count
       FROM assets`
    );
    return result.rows[0];
  }

  static async getAssetDepreciationTotal() {
    const result = await db.query(
      `SELECT
        COALESCE(SUM(purchase_cost), 0) AS total_acquisition_cost,
        COALESCE(SUM(current_value), 0) AS total_current_value,
        COALESCE(SUM(accumulated_depreciation), 0) AS total_depreciation
       FROM assets WHERE lifecycle_status = 'active'`
    );
    return result.rows[0];
  }

  static async getMaintenanceCosts(months = 12) {
    const result = await db.query(
      `SELECT
        EXTRACT(MONTH FROM created_at)::int AS month,
        EXTRACT(YEAR FROM created_at)::int AS year,
        COALESCE(SUM(cost), 0) AS total_cost,
        COALESCE(SUM(parts_cost), 0) AS total_parts_cost,
        COALESCE(SUM(labor_cost), 0) AS total_labor_cost
       FROM maintenance_records
       WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE) - ($1 || ' months')::interval
       GROUP BY year, month
       ORDER BY year DESC, month DESC`,
      [months]
    );
    return result.rows;
  }

  static async getProcurementSpending(months = 12) {
    const result = await db.query(
      `SELECT
        EXTRACT(MONTH FROM order_date)::int AS month,
        EXTRACT(YEAR FROM order_date)::int AS year,
        COUNT(*)::int AS po_count,
        COALESCE(SUM(total_amount), 0) AS total_spent
       FROM purchase_orders
       WHERE status NOT IN ('draft', 'cancelled')
         AND order_date >= DATE_TRUNC('month', CURRENT_DATE) - ($1 || ' months')::interval
       GROUP BY year, month
       ORDER BY year DESC, month DESC`,
      [months]
    );
    return result.rows;
  }

  static async getInventoryValue() {
    const result = await db.query(
      `SELECT
        COUNT(*)::int AS total_items,
        COALESCE(SUM(current_quantity * average_cost), 0) AS total_inventory_value,
        COUNT(*) FILTER (WHERE current_quantity <= reorder_point AND is_active = true)::int AS low_stock_count
       FROM inventory_items WHERE is_active = true`
    );
    return result.rows[0];
  }

  static async getSupplierPerformance() {
    const result = await db.query(
      `SELECT
        COUNT(*)::int AS total_suppliers,
        ROUND(AVG(rating), 2) AS average_rating,
        COUNT(*) FILTER (WHERE rating >= 4)::int AS high_performers,
        COUNT(*) FILTER (WHERE rating < 3 AND rating > 0)::int AS low_performers
       FROM procurement_suppliers WHERE status = 'active' AND rating > 0`
    );
    return result.rows[0];
  }

  static async getPendingApprovals() {
    const result = await db.query(
      `SELECT
        (SELECT COUNT(*)::int FROM procurement_approvals WHERE status = 'pending') AS procurement_pending,
        (SELECT COUNT(*)::int FROM leave_requests WHERE status = 'pending') AS leave_pending,
        (SELECT COUNT(*)::int FROM expenses WHERE status = 'pending') AS expense_pending,
        (SELECT COUNT(*)::int FROM purchase_orders WHERE status = 'pending') AS po_pending`
    );
    return result.rows[0];
  }

  static async getComplianceScore() {
    const result = await db.query(
      `SELECT
        COUNT(*)::int AS total_records,
        COUNT(*) FILTER (WHERE status = 'compliant')::int AS compliant_count,
        CASE WHEN COUNT(*) > 0
          THEN ROUND((COUNT(*) FILTER (WHERE status = 'compliant')::numeric / COUNT(*)) * 100, 2)
          ELSE 0
        END AS compliance_percentage
       FROM compliance_records`
    );
    return result.rows[0];
  }

  static async getExecutiveSummary(roleName = null, departmentId = null) {
    const isCeo = roleName === 'CEO' || roleName === 'Admin' || roleName === 'System Admin';
    const isManager = roleName === 'Manager';

    const employeeCount = departmentId
      ? await this.getEmployeeCount(departmentId)
      : await this.getEmployeeCount();

    const departmentHeadcount = isCeo ? await this.getDepartmentHeadcount() : [];
    const assetStats = isCeo ? await this.getAssetStats() : null;
    const pendingApprovals = await this.getPendingApprovals();
    const compliance = isCeo ? await this.getComplianceScore() : null;
    const inventoryValue = isCeo ? await this.getInventoryValue() : null;

    let budgetUtilization = [];
    if (isCeo) {
      budgetUtilization = await this.getBudgetUtilization();
    } else if (isManager && departmentId) {
      budgetUtilization = await this.getBudgetUtilization(departmentId);
    }

    const summary = {
      employeeCount,
      departmentHeadcount,
      assetStats,
      pendingApprovals,
      compliance,
      inventoryValue,
      budgetUtilization,
      generatedAt: new Date().toISOString(),
    };

    return summary;
  }
}

module.exports = AnalyticsEngine;
