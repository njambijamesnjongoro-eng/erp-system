const db = require('../../config/db');
const AnalyticsEngine = require('../../services/analyticsEngine');

exports.getRevenueTrends = async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 12;
    const data = await AnalyticsEngine.getMonthlyRevenue(months);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getDepartmentComparison = async (req, res) => {
  try {
    const metric = req.query.metric || 'headcount';
    let data;

    switch (metric) {
      case 'headcount':
        data = await db.query(
          `SELECT d.id, d.name AS department_name,
            COUNT(ep.id)::int AS employee_count,
            COUNT(ep.id) FILTER (WHERE ep.gender = 'Male')::int AS male_count,
            COUNT(ep.id) FILTER (WHERE ep.gender = 'Female')::int AS female_count
           FROM departments d
           LEFT JOIN employee_profiles ep ON ep.department_id = d.id AND ep.employment_status = 'active'
           GROUP BY d.id, d.name
           ORDER BY employee_count DESC`
        );
        data = data.rows;
        break;
      case 'budget':
        data = await db.query(
          `SELECT d.id, d.name AS department_name,
            COALESCE(b.total_amount, 0) AS budget_amount,
            COALESCE(b.spent_amount, 0) AS spent_amount,
            CASE WHEN COALESCE(b.total_amount, 0) > 0
              THEN ROUND((COALESCE(b.spent_amount, 0)::numeric / b.total_amount) * 100, 2)
              ELSE 0 END AS utilization
           FROM departments d
           LEFT JOIN budgets b ON b.department_id = d.id AND b.status = 'approved'
             AND b.fiscal_year = EXTRACT(YEAR FROM CURRENT_DATE)::int
           ORDER BY budget_amount DESC`
        );
        data = data.rows;
        break;
      case 'spending':
        data = await db.query(
          `SELECT d.id, d.name AS department_name,
            COUNT(DISTINCT pr.id)::int AS request_count,
            COALESCE(SUM(po.total_amount), 0) AS total_spent
           FROM departments d
           LEFT JOIN procurement_requests pr ON pr.department_id = d.id
           LEFT JOIN purchase_orders po ON po.request_id = pr.id AND po.status NOT IN ('draft','cancelled')
           GROUP BY d.id, d.name
           ORDER BY total_spent DESC`
        );
        data = data.rows;
        break;
      case 'attendance':
        data = await db.query(
          `SELECT d.id, d.name AS department_name,
            COUNT(a.id)::int AS total_days,
            COUNT(a.id) FILTER (WHERE a.status = 'present')::int AS present_days,
            CASE WHEN COUNT(a.id) > 0
              THEN ROUND((COUNT(a.id) FILTER (WHERE a.status = 'present')::numeric / COUNT(a.id)) * 100, 2)
              ELSE 0 END AS attendance_rate
           FROM departments d
           LEFT JOIN employee_profiles ep ON ep.department_id = d.id
           LEFT JOIN attendance a ON a.employee_id = ep.id
             AND DATE_TRUNC('month', a.date) = DATE_TRUNC('month', CURRENT_DATE)
           GROUP BY d.id, d.name
           ORDER BY attendance_rate DESC`
        );
        data = data.rows;
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid metric' });
    }

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getYearOverYear = async (req, res) => {
  try {
    const metric = req.query.metric || 'revenue';
    const years = parseInt(req.query.years) || 3;
    let data;

    switch (metric) {
      case 'revenue':
        data = await db.query(
          `SELECT EXTRACT(YEAR FROM transaction_date)::int AS year,
            COALESCE(SUM(credit), 0) AS total_revenue,
            COALESCE(SUM(debit), 0) AS total_expenses,
            COALESCE(SUM(credit), 0) - COALESCE(SUM(debit), 0) AS net_profit
           FROM financial_transactions
           WHERE EXTRACT(YEAR FROM transaction_date) >= EXTRACT(YEAR FROM CURRENT_DATE) - $1 + 1
           GROUP BY year
           ORDER BY year`,
          [years]
        );
        data = data.rows;
        break;
      case 'payroll':
        data = await db.query(
          `SELECT EXTRACT(YEAR FROM created_at)::int AS year,
            COALESCE(SUM(gross_pay), 0) AS total_gross,
            COALESCE(SUM(net_pay), 0) AS total_net
           FROM payroll
           WHERE EXTRACT(YEAR FROM created_at) >= EXTRACT(YEAR FROM CURRENT_DATE) - $1 + 1
           GROUP BY year
           ORDER BY year`,
          [years]
        );
        data = data.rows;
        break;
      case 'headcount':
        data = await db.query(
          `SELECT EXTRACT(YEAR FROM created_at)::int AS year,
            COUNT(*)::int AS hired,
            COUNT(*) FILTER (WHERE employment_status = 'terminated')::int AS terminated,
            MAX(COUNT(*)) OVER (ORDER BY EXTRACT(YEAR FROM created_at))) AS running_total
           FROM employee_profiles
           WHERE EXTRACT(YEAR FROM created_at) >= EXTRACT(YEAR FROM CURRENT_DATE) - $1 + 1
           GROUP BY year
           ORDER BY year`,
          [years]
        );
        data = data.rows;
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid metric' });
    }

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getKpiRecords = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const { kpi_name, period, department_id } = req.query;
    const params = [];
    let idx = 1;
    let whereClause = '';

    if (kpi_name) {
      whereClause += ` AND kpi_name = $${idx++}`;
      params.push(kpi_name);
    }
    if (period) {
      whereClause += ` AND period = $${idx++}`;
      params.push(period);
    }
    if (department_id) {
      whereClause += ` AND department_id = $${idx++}`;
      params.push(department_id);
    }

    const countResult = await db.query(
      `SELECT COUNT(*) OVER() AS total, kr.*, d.name AS department_name
       FROM kpi_records kr
       LEFT JOIN departments d ON kr.department_id = d.id
       WHERE 1=1 ${whereClause}
       ORDER BY kr.recorded_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );

    const total = countResult.rows.length > 0 ? parseInt(countResult.rows[0].total) : 0;
    res.json({ success: true, data: countResult.rows, total, page, limit });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.recordKpi = async (req, res) => {
  try {
    const { kpi_name, value, target, period, department_id, context } = req.body;
    const result = await db.query(
      `INSERT INTO kpi_records (kpi_name, value, target, period, department_id, context, recorded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [kpi_name, value, target, period, department_id || null, context ? JSON.stringify(context) : null, req.user.id]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAnalyticsData = async (req, res) => {
  try {
    const { type, department_id, date_from, date_to } = req.query;
    let data;

    switch (type) {
      case 'employee':
        data = await db.query(
          `SELECT ep.*, d.name AS department_name
           FROM employee_profiles ep
           LEFT JOIN departments d ON ep.department_id = d.id
           WHERE ($1::int IS NULL OR ep.department_id = $1)
           ORDER BY ep.full_name`,
          [department_id || null]
        );
        data = data.rows;
        break;
      case 'financial':
        data = await db.query(
          `SELECT DATE_TRUNC('month', transaction_date) AS month,
            COALESCE(SUM(credit), 0) AS revenue,
            COALESCE(SUM(debit), 0) AS expenses
           FROM financial_transactions
           WHERE ($1::date IS NULL OR transaction_date >= $1)
             AND ($2::date IS NULL OR transaction_date <= $2)
           GROUP BY month ORDER BY month`,
          [date_from || null, date_to || null]
        );
        data = data.rows;
        break;
      case 'procurement':
        data = await db.query(
          `SELECT po.*, ps.supplier_name, pr.title AS request_title
           FROM purchase_orders po
           LEFT JOIN procurement_suppliers ps ON po.supplier_id = ps.id
           LEFT JOIN procurement_requests pr ON po.request_id = pr.id
           WHERE ($1::int IS NULL OR po.department_id = $1)
           ORDER BY po.created_at DESC LIMIT 100`,
          [department_id || null]
        );
        data = data.rows;
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid analytics type' });
    }

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
