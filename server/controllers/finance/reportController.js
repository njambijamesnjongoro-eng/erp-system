const db = require('../../config/db');

exports.profitLoss = async (req, res) => {
  try {
    const { from_date, to_date } = req.query;
    const fDate = from_date || `${new Date().getFullYear()}-01-01`;
    const tDate = to_date || new Date().toISOString().split('T')[0];

    const income = await db.query(
      `SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE status='approved' AND expense_date BETWEEN $1 AND $2`,
      [fDate, tDate]
    );
    const revenue = await db.query(
      `SELECT COALESCE(SUM(amount),0) as total FROM invoices WHERE status='paid' AND issue_date BETWEEN $1 AND $2`,
      [fDate, tDate]
    );

    const totalIncome = parseFloat(revenue.rows[0].total);
    const totalExpenses = parseFloat(income.rows[0].total);
    const netProfit = totalIncome - totalExpenses;

    res.json({
      success: true,
      data: {
        period: { from: fDate, to: tDate },
        totalIncome,
        totalExpenses,
        grossProfit: totalIncome,
        netProfit,
        profitMargin: totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(2) : 0,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.expenseReport = async (req, res) => {
  try {
    const { from_date, to_date, group_by = 'category' } = req.query;
    const fDate = from_date || `${new Date().getFullYear()}-01-01`;
    const tDate = to_date || new Date().toISOString().split('T')[0];

    const groupCol = group_by === 'department' ? 'd.name' : 'e.expense_category';
    const joinClause = group_by === 'department' ? 'LEFT JOIN departments d ON d.id = e.department_id' : '';

    const result = await db.query(
      `SELECT ${groupCol} as group_name, COUNT(*) as count, COALESCE(SUM(e.amount),0) as total
       FROM expenses e ${joinClause}
       WHERE e.expense_date BETWEEN $1 AND $2
       GROUP BY ${groupCol} ORDER BY total DESC`,
      [fDate, tDate]
    );
    const grandTotal = result.rows.reduce((s, r) => s + parseFloat(r.total), 0);

    res.json({ success: true, data: { groups: result.rows, grandTotal, period: { from: fDate, to: tDate } } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.budgetReport = async (req, res) => {
  try {
    const { fiscal_year } = req.query;
    const year = fiscal_year || new Date().getFullYear();
    const result = await db.query(`
      SELECT b.*, d.name as department_name,
        CASE WHEN b.allocated_amount > 0 THEN ((b.spent_amount / b.allocated_amount) * 100) ELSE 0 END as utilization_pct
      FROM budgets b
      LEFT JOIN departments d ON d.id = b.department_id
      WHERE b.fiscal_year = $1
      ORDER BY utilization_pct DESC
    `, [year]);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.taxSummary = async (req, res) => {
  try {
    const { year } = req.query;
    const y = year || new Date().getFullYear();
    const result = await db.query(`
      SELECT tax_type, COUNT(*) as count, COALESCE(SUM(amount),0) as total, COALESCE(SUM(paid_amount),0) as paid, COALESCE(SUM(balance),0) as outstanding
      FROM tax_records WHERE tax_period LIKE $1 GROUP BY tax_type
    `, [`${y}%`]);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.payrollSummary = async (req, res) => {
  try {
    const { year } = req.query;
    const y = year || new Date().getFullYear();
    const result = await db.query(`
      SELECT pp.period_month, pp.period_name,
        COUNT(p.id) as employee_count, COALESCE(SUM(p.gross_pay),0) as gross_pay,
        COALESCE(SUM(p.total_deductions),0) as deductions, COALESCE(SUM(p.net_pay),0) as net_pay
      FROM payroll p
      JOIN payroll_periods pp ON pp.id = p.payroll_period_id
      WHERE pp.period_year = $1 AND pp.status = 'closed'
      GROUP BY pp.id, pp.period_month, pp.period_name ORDER BY pp.period_month
    `, [y]);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.balanceSheet = async (req, res) => {
  try {
    const assets = await db.query("SELECT account_type, COALESCE(SUM(debit-credit),0) as balance FROM financial_transactions ft JOIN chart_of_accounts a ON a.id=ft.account_id WHERE a.account_type='asset' GROUP BY account_type");
    const liabilities = await db.query("SELECT account_type, COALESCE(SUM(credit-debit),0) as balance FROM financial_transactions ft JOIN chart_of_accounts a ON a.id=ft.account_id WHERE a.account_type='liability' GROUP BY account_type");
    const equity = await db.query("SELECT account_type, COALESCE(SUM(credit-debit),0) as balance FROM financial_transactions ft JOIN chart_of_accounts a ON a.id=ft.account_id WHERE a.account_type='equity' GROUP BY account_type");
    const totalAssets = assets.rows.reduce((s, r) => s + parseFloat(r.balance || 0), 0);
    const totalLiabilities = liabilities.rows.reduce((s, r) => s + parseFloat(r.balance || 0), 0);
    const totalEquity = equity.rows.reduce((s, r) => s + parseFloat(r.balance || 0), 0);
    res.json({ success: true, data: { assets: totalAssets, liabilities: totalLiabilities, equity: totalEquity, assetsDetail: assets.rows, liabilitiesDetail: liabilities.rows, equityDetail: equity.rows } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
