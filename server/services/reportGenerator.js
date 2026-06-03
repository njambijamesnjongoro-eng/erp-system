const db = require('../config/db');

class ReportGenerator {
  static getReportDefinitions() {
    return [
      { type: 'hr_analytics', name: 'HR Analytics Report', category: 'HR', description: 'Employee demographics, turnover, attendance' },
      { type: 'payroll', name: 'Payroll Report', category: 'Finance', description: 'Salary summary, deductions, tax, net pay' },
      { type: 'financial', name: 'Financial Statement', category: 'Finance', description: 'Revenue, expenses, profit & loss' },
      { type: 'asset', name: 'Asset Report', category: 'Assets', description: 'Asset inventory, depreciation, maintenance' },
      { type: 'inventory', name: 'Inventory Report', category: 'Procurement', description: 'Stock levels, value, movements' },
      { type: 'procurement', name: 'Procurement Report', category: 'Procurement', description: 'Purchase orders, spending, supplier performance' },
      { type: 'compliance', name: 'Compliance Report', category: 'Compliance', description: 'Compliance status, risks, audit readiness' },
      { type: 'audit', name: 'Audit Log Report', category: 'System', description: 'User activity, system changes, security events' },
      { type: 'insurance', name: 'Insurance Report', category: 'Assets', description: 'Insurance policies, coverage, expiries' },
    ];
  }

  static async collectReportData(type, parameters = {}) {
    switch (type) {
      case 'hr_analytics':
        return await this._getHRData(parameters);
      case 'payroll':
        return await this._getPayrollData(parameters);
      case 'financial':
        return await this._getFinancialData(parameters);
      case 'asset':
        return await this._getAssetData(parameters);
      case 'inventory':
        return await this._getInventoryData(parameters);
      case 'procurement':
        return await this._getProcurementData(parameters);
      case 'compliance':
        return await this._getComplianceData(parameters);
      case 'audit':
        return await this._getAuditData(parameters);
      case 'insurance':
        return await this._getInsuranceData(parameters);
      default:
        throw new Error('Unknown report type: ' + type);
    }
  }

  static async _getHRData(params = {}) {
    let sql = `SELECT
      ep.*, d.name AS department_name, r.name AS role_name,
      (SELECT COUNT(*)::int FROM attendance a WHERE a.employee_id = ep.id
        AND DATE_TRUNC('month', a.date) = DATE_TRUNC('month', CURRENT_DATE)) AS attendance_count,
      (SELECT SUM(total_days)::int FROM leave_requests lr WHERE lr.employee_id = ep.id
        AND lr.status = 'approved' AND DATE_TRUNC('year', lr.created_at) = DATE_TRUNC('year', CURRENT_DATE)) AS leave_days_taken,
      (SELECT overall_rating FROM performance_reviews pr WHERE pr.employee_id = ep.id
        ORDER BY pr.created_at DESC LIMIT 1) AS last_performance_rating
      FROM employee_profiles ep
      LEFT JOIN departments d ON ep.department_id = d.id
      LEFT JOIN users u ON ep.user_id = u.id
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE 1=1`;
    const paramValues = [];
    let idx = 1;
    if (params.department_id) {
      sql += ` AND ep.department_id = $${idx++}`;
      paramValues.push(params.department_id);
    }
    if (params.employment_status) {
      sql += ` AND ep.employment_status = $${idx++}`;
      paramValues.push(params.employment_status);
    }
    sql += ` ORDER BY ep.full_name`;
    const result = await db.query(sql, paramValues);
    return result.rows;
  }

  static async _getPayrollData(params = {}) {
    let sql = `SELECT
      p.*, ep.full_name, ep.employee_id, d.name AS department_name,
      pp.period_name, pp.period_year, pp.period_month
      FROM payroll p
      JOIN employee_profiles ep ON p.employee_id = ep.id
      LEFT JOIN departments d ON ep.department_id = d.id
      JOIN payroll_periods pp ON p.payroll_period_id = pp.id
      WHERE 1=1`;
    const paramValues = [];
    let idx = 1;
    if (params.payroll_period_id) {
      sql += ` AND p.payroll_period_id = $${idx++}`;
      paramValues.push(params.payroll_period_id);
    }
    if (params.department_id) {
      sql += ` AND ep.department_id = $${idx++}`;
      paramValues.push(params.department_id);
    }
    if (params.payment_status) {
      sql += ` AND p.payment_status = $${idx++}`;
      paramValues.push(params.payment_status);
    }
    sql += ` ORDER BY ep.full_name`;
    const result = await db.query(sql, paramValues);
    return result.rows;
  }

  static async _getFinancialData(params = {}) {
    const revenue = await db.query(
      `SELECT DATE_TRUNC('month', transaction_date) AS month,
        SUM(credit) AS total_revenue, SUM(debit) AS total_expenses,
        SUM(credit) - SUM(debit) AS net_profit
       FROM financial_transactions
       WHERE transaction_date >= COALESCE($1::date, DATE_TRUNC('year', CURRENT_DATE))
       GROUP BY DATE_TRUNC('month', transaction_date)
       ORDER BY month DESC`,
      [params.dateFrom || null]
    );
    const expenses = await db.query(
      `SELECT expense_category, SUM(amount) AS total, COUNT(*)::int AS count
       FROM expenses
       WHERE expense_date >= COALESCE($1::date, DATE_TRUNC('year', CURRENT_DATE))
       GROUP BY expense_category ORDER BY total DESC`,
      [params.dateFrom || null]
    );
    return { revenue: revenue.rows, expenses: expenses.rows };
  }

  static async _getAssetData(params = {}) {
    const assets = await db.query(
      `SELECT a.*, ac.category_name, d.name AS department_name,
        ep.full_name AS assigned_to_name
       FROM assets a
       LEFT JOIN asset_categories ac ON a.category_id = ac.id
       LEFT JOIN departments d ON a.department_id = d.id
       LEFT JOIN employee_profiles ep ON a.assigned_to = ep.id
       WHERE 1=1
       ORDER BY a.asset_name`
    );
    const maintenance = await db.query(
      `SELECT DATE_TRUNC('month', created_at) AS month,
        SUM(cost) AS total_cost, COUNT(*)::int AS count
       FROM maintenance_records
       GROUP BY DATE_TRUNC('month', created_at)
       ORDER BY month DESC LIMIT 12`
    );
    const depreciation = await db.query(
      `SELECT SUM(purchase_cost) AS total_cost, SUM(current_value) AS total_value,
        SUM(accumulated_depreciation) AS total_depreciation
       FROM assets WHERE lifecycle_status = 'active'`
    );
    return { assets: assets.rows, maintenance: maintenance.rows, depreciation: depreciation.rows[0] };
  }

  static async _getInventoryData(params = {}) {
    const items = await db.query(
      `SELECT ii.*, ic.category_name, w.name AS warehouse_name, ps.supplier_name
       FROM inventory_items ii
       LEFT JOIN inventory_categories ic ON ii.category_id = ic.id
       LEFT JOIN warehouses w ON ii.warehouse_id = w.id
       LEFT JOIN procurement_suppliers ps ON ii.supplier_id = ps.id
       WHERE ii.is_active = true
       ORDER BY ii.item_name`
    );
    const stockValue = await db.query(
      `SELECT COUNT(*)::int AS total_items,
        SUM(current_quantity * average_cost) AS total_value,
        COUNT(*) FILTER (WHERE current_quantity <= reorder_point)::int AS low_stock_count
       FROM inventory_items WHERE is_active = true`
    );
    const movements = await db.query(
      `SELECT DATE_TRUNC('month', created_at) AS month,
        movement_type, SUM(quantity) AS total_qty, SUM(total_cost) AS total_cost
       FROM procurement_stock_movements
       WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '6 months')
       GROUP BY month, movement_type ORDER BY month DESC`
    );
    return { items: items.rows, stockValue: stockValue.rows[0], movements: movements.rows };
  }

  static async _getProcurementData(params = {}) {
    const purchaseOrders = await db.query(
      `SELECT po.*, ps.supplier_name, ep.full_name AS created_by_name
       FROM purchase_orders po
       LEFT JOIN procurement_suppliers ps ON po.supplier_id = ps.id
       LEFT JOIN employee_profiles ep ON po.created_by = ep.id
       ORDER BY po.created_at DESC LIMIT 100`
    );
    const supplierPerformance = await db.query(
      `SELECT ps.supplier_name, ps.rating, ps.status,
        (SELECT COUNT(*)::int FROM purchase_orders WHERE supplier_id = ps.id) AS po_count
       FROM procurement_suppliers ps
       WHERE ps.status = 'active'
       ORDER BY ps.rating DESC`
    );
    return { purchaseOrders: purchaseOrders.rows, supplierPerformance: supplierPerformance.rows };
  }

  static async _getComplianceData(params = {}) {
    const result = await db.query(
      `SELECT cr.*, d.name AS department_name
       FROM compliance_records cr
       LEFT JOIN departments d ON cr.entity_type = 'department' AND cr.entity_id = d.id
       ORDER BY cr.due_date ASC`
    );
    const summary = await db.query(
      `SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'compliant')::int AS compliant,
        COUNT(*) FILTER (WHERE status = 'non_compliant')::int AS non_compliant,
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
        CASE WHEN COUNT(*) > 0
          THEN ROUND(COUNT(*) FILTER (WHERE status = 'compliant')::numeric / COUNT(*) * 100, 2)
          ELSE 0
        END AS compliance_rate
       FROM compliance_records`
    );
    return { records: result.rows, summary: summary.rows[0] };
  }

  static async _getAuditData(params = {}) {
    const logs = await db.query(
      `SELECT al.*, u.email AS user_email
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ORDER BY al.created_at DESC LIMIT 200`
    );
    const activity = await db.query(
      `SELECT af.*, u.email AS user_email
       FROM activity_feed af
       LEFT JOIN users u ON af.user_id = u.id
       ORDER BY af.created_at DESC LIMIT 200`
    );
    return { auditLogs: logs.rows, activityFeed: activity.rows };
  }

  static async _getInsuranceData(params = {}) {
    const policies = await db.query(
      `SELECT aip.*, a.asset_name, a.asset_tag, fv.registration_number
       FROM asset_insurance_policies aip
       LEFT JOIN assets a ON aip.asset_id = a.id
       LEFT JOIN fleet_vehicles fv ON aip.vehicle_id = fv.id
       ORDER BY aip.end_date ASC`
    );
    const summary = await db.query(
      `SELECT
        COUNT(*)::int AS total_policies,
        SUM(premium_amount) AS total_premiums,
        SUM(coverage_amount) AS total_coverage,
        COUNT(*) FILTER (WHERE status = 'active')::int AS active_policies,
        COUNT(*) FILTER (WHERE end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days')::int AS expiring_soon
       FROM asset_insurance_policies`
    );
    return { policies: policies.rows, summary: summary.rows[0] };
  }

  static async generateReport(type, parameters = {}, format = 'json', userId = null) {
    const definitions = this.getReportDefinitions();
    const def = definitions.find(d => d.type === type);
    if (!def) throw new Error('Unknown report type: ' + type);

    const data = await this.collectReportData(type, parameters);
    const reportName = `${def.name} - ${new Date().toISOString().split('T')[0]}`;

    const reportResult = await db.query(
      `INSERT INTO reports (name, type, description, parameters, file_type, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        reportName,
        type,
        def.description,
        JSON.stringify(parameters),
        format,
        userId,
      ]
    );

    return {
      report: reportResult.rows[0],
      data,
    };
  }

  static async getReports(filters = {}) {
    let sql = `SELECT r.*, u.email AS created_by_email
               FROM reports r
               LEFT JOIN users u ON r.created_by = u.id
               WHERE 1=1`;
    const params = [];
    let idx = 1;
    if (filters.type) {
      sql += ` AND r.type = $${idx++}`;
      params.push(filters.type);
    }
    if (filters.created_by) {
      sql += ` AND r.created_by = $${idx++}`;
      params.push(filters.created_by);
    }
    sql += ` ORDER BY r.created_at DESC`;
    if (filters.limit) {
      sql += ` LIMIT $${idx++}`;
      params.push(filters.limit);
    }
    const result = await db.query(sql, params);
    return result.rows;
  }

  static async getReportById(id) {
    const result = await db.query(
      `SELECT r.*, u.email AS created_by_email
       FROM reports r
       LEFT JOIN users u ON r.created_by = u.id
       WHERE r.id = $1`,
      [id]
    );
    if (result.rows.length === 0) throw new Error('Report not found');
    return result.rows[0];
  }

  static async deleteReport(id) {
    const result = await db.query(`DELETE FROM reports WHERE id = $1 RETURNING id`, [id]);
    if (result.rows.length === 0) throw new Error('Report not found');
    return { deleted: true };
  }

  static async getSchedules() {
    const result = await db.query(
      `SELECT rs.*, r.name AS report_name, r.type AS report_type
       FROM report_schedules rs
       JOIN reports r ON rs.report_id = r.id
       WHERE rs.is_active = true
       ORDER BY rs.next_run_at ASC`
    );
    return result.rows;
  }

  static async createSchedule(data) {
    const result = await db.query(
      `INSERT INTO report_schedules (report_id, frequency, day_of_week, day_of_month, time_of_day, recipients, is_active, next_run_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        data.report_id,
        data.frequency,
        data.day_of_week || null,
        data.day_of_month || null,
        data.time_of_day || '08:00',
        data.recipients || [],
        data.is_active !== false,
        data.next_run_at || null,
      ]
    );
    return result.rows[0];
  }

  static async updateSchedule(id, data) {
    const existing = await db.query(`SELECT id FROM report_schedules WHERE id = $1`, [id]);
    if (existing.rows.length === 0) throw new Error('Schedule not found');
    const result = await db.query(
      `UPDATE report_schedules
       SET frequency = COALESCE($1, frequency),
           day_of_week = COALESCE($2, day_of_week),
           day_of_month = COALESCE($3, day_of_month),
           time_of_day = COALESCE($4, time_of_day),
           recipients = COALESCE($5, recipients),
           is_active = COALESCE($6, is_active),
           next_run_at = COALESCE($7, next_run_at),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8 RETURNING *`,
      [
        data.frequency || null,
        data.day_of_week !== undefined ? data.day_of_week : null,
        data.day_of_month !== undefined ? data.day_of_month : null,
        data.time_of_day || null,
        data.recipients || null,
        data.is_active !== undefined ? data.is_active : null,
        data.next_run_at || null,
        id,
      ]
    );
    return result.rows[0];
  }

  static async deleteSchedule(id) {
    const result = await db.query(`DELETE FROM report_schedules WHERE id = $1 RETURNING id`, [id]);
    if (result.rows.length === 0) throw new Error('Schedule not found');
    return { deleted: true };
  }

  static async processScheduledReports() {
    const due = await db.query(
      `SELECT rs.*, r.type AS report_type, r.name AS report_name
       FROM report_schedules rs
       JOIN reports r ON rs.report_id = r.id
       WHERE rs.is_active = true
         AND (rs.next_run_at IS NULL OR rs.next_run_at <= CURRENT_TIMESTAMP)`
    );
    const generated = [];
    for (const schedule of due.rows) {
      try {
        const report = await db.query(
          `SELECT * FROM reports WHERE id = $1`,
          [schedule.report_id]
        );
        if (report.rows.length === 0) continue;
        const parameters = report.rows[0].parameters || {};
        const result = await this.generateReport(
          schedule.report_type,
          parameters,
          'json',
          null
        );
        let nextRun;
        switch (schedule.frequency) {
          case 'daily':
            nextRun = new Date();
            nextRun.setDate(nextRun.getDate() + 1);
            break;
          case 'weekly':
            nextRun = new Date();
            nextRun.setDate(nextRun.getDate() + 7);
            break;
          case 'monthly':
            nextRun = new Date();
            nextRun.setMonth(nextRun.getMonth() + 1);
            break;
          default:
            nextRun = new Date();
            nextRun.setDate(nextRun.getDate() + 1);
        }
        await db.query(
          `UPDATE report_schedules SET last_run_at = CURRENT_TIMESTAMP, next_run_at = $1 WHERE id = $2`,
          [nextRun, schedule.id]
        );
        generated.push(result.report);
      } catch (err) {
        console.error(`Failed to generate scheduled report ${schedule.id}: ${err.message}`);
      }
    }
    return generated;
  }
}

module.exports = ReportGenerator;
