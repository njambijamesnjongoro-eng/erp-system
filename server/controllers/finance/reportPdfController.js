const db = require('../../config/db');
const { sendPdfReport, labelize } = require('../../utils/pdfReport');

const currentYear = () => new Date().getFullYear();
const today = () => new Date().toISOString().split('T')[0];

const dateFilters = (query) => ({
  from: query.from_date || `${currentYear()}-01-01`,
  to: query.to_date || today(),
});

const buildFinanceReport = async (type, query) => {
  if (type === 'profit-loss') {
    const { from, to } = dateFilters(query);
    const expenses = await db.query(
      "SELECT COALESCE(SUM(amount),0) total FROM expenses WHERE status='approved' AND expense_date BETWEEN $1 AND $2",
      [from, to]
    );
    const revenue = await db.query(
      "SELECT COALESCE(SUM(amount),0) total FROM invoices WHERE status='paid' AND issue_date BETWEEN $1 AND $2",
      [from, to]
    );
    const totalIncome = Number(revenue.rows[0].total || 0);
    const totalExpenses = Number(expenses.rows[0].total || 0);
    const netProfit = totalIncome - totalExpenses;
    return {
      title: 'Profit and Loss Report',
      filename: `profit-loss-${from}-to-${to}.pdf`,
      filters: [{ label: 'From', value: from }, { label: 'To', value: to }],
      summary: [
        { label: 'Total Income', value: totalIncome, type: 'currency' },
        { label: 'Total Expenses', value: totalExpenses, type: 'currency' },
        { label: 'Net Profit', value: netProfit, type: 'currency' },
        { label: 'Profit Margin', value: totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0, type: 'percent' },
      ],
      sections: [{
        title: 'Profit and Loss Lines',
        columns: [
          { key: 'line', label: 'Line', width: 220 },
          { key: 'amount', label: 'Amount', type: 'currency', width: 160 },
        ],
        rows: [
          { line: 'Income', amount: totalIncome },
          { line: 'Expenses', amount: totalExpenses },
          { line: 'Net Profit', amount: netProfit },
        ],
      }],
    };
  }

  if (type === 'expenses') {
    const { from, to } = dateFilters(query);
    const groupBy = query.group_by === 'department' ? 'department' : 'category';
    const groupCol = groupBy === 'department' ? 'd.name' : 'e.expense_category';
    const joinClause = groupBy === 'department' ? 'LEFT JOIN departments d ON d.id = e.department_id' : '';
    const result = await db.query(
      `SELECT COALESCE(${groupCol}, 'Unassigned') group_name, COUNT(*)::int count, COALESCE(SUM(e.amount),0) total
       FROM expenses e ${joinClause}
       WHERE e.expense_date BETWEEN $1 AND $2
       GROUP BY ${groupCol}
       ORDER BY total DESC`,
      [from, to]
    );
    const grandTotal = result.rows.reduce((sum, row) => sum + Number(row.total || 0), 0);
    return {
      title: 'Expense Report',
      filename: `expenses-${from}-to-${to}.pdf`,
      filters: [{ label: 'From', value: from }, { label: 'To', value: to }, { label: 'Grouped By', value: labelize(groupBy) }],
      summary: [{ label: 'Grand Total', value: grandTotal, type: 'currency' }],
      sections: [{
        title: 'Expense Groups',
        columns: [
          { key: 'group_name', label: 'Group', width: 230 },
          { key: 'count', label: 'Count', width: 90 },
          { key: 'total', label: 'Total', type: 'currency', width: 150 },
        ],
        rows: result.rows,
      }],
    };
  }

  if (type === 'budgets') {
    const year = query.fiscal_year || currentYear();
    const result = await db.query(`
      SELECT b.budget_name, d.name department_name, b.allocated_amount, b.spent_amount,
             b.remaining_amount,
             CASE WHEN b.allocated_amount > 0 THEN ((b.spent_amount / b.allocated_amount) * 100) ELSE 0 END utilization_pct
      FROM budgets b
      LEFT JOIN departments d ON d.id = b.department_id
      WHERE b.fiscal_year = $1
      ORDER BY utilization_pct DESC
    `, [year]);
    return {
      title: 'Budget Report',
      filename: `budgets-${year}.pdf`,
      filters: [{ label: 'Fiscal Year', value: year }],
      sections: [{
        title: 'Budgets',
        columns: [
          { key: 'budget_name', label: 'Budget', width: 150 },
          { key: 'department_name', label: 'Department', width: 120 },
          { key: 'allocated_amount', label: 'Allocated', type: 'currency', width: 100 },
          { key: 'spent_amount', label: 'Spent', type: 'currency', width: 90 },
          { key: 'utilization_pct', label: 'Used', type: 'percent', width: 70 },
        ],
        rows: result.rows,
      }],
    };
  }

  if (type === 'taxes') {
    const year = query.year || currentYear();
    const result = await db.query(`
      SELECT tax_type, COUNT(*)::int count, COALESCE(SUM(amount),0) total,
             COALESCE(SUM(paid_amount),0) paid, COALESCE(SUM(balance),0) outstanding
      FROM tax_records
      WHERE tax_period LIKE $1
      GROUP BY tax_type
      ORDER BY tax_type
    `, [`${year}%`]);
    return {
      title: 'Tax Summary Report',
      filename: `tax-summary-${year}.pdf`,
      filters: [{ label: 'Year', value: year }],
      sections: [{
        title: 'Tax Summary',
        columns: [
          { key: 'tax_type', label: 'Tax Type', width: 160 },
          { key: 'count', label: 'Count', width: 70 },
          { key: 'total', label: 'Total', type: 'currency', width: 100 },
          { key: 'paid', label: 'Paid', type: 'currency', width: 100 },
          { key: 'outstanding', label: 'Outstanding', type: 'currency', width: 110 },
        ],
        rows: result.rows,
      }],
    };
  }

  if (type === 'payroll') {
    const year = query.year || currentYear();
    const result = await db.query(`
      SELECT pp.period_name, COUNT(p.id)::int employee_count, COALESCE(SUM(p.gross_pay),0) gross_pay,
             COALESCE(SUM(p.total_deductions),0) deductions, COALESCE(SUM(p.net_pay),0) net_pay
      FROM payroll p
      JOIN payroll_periods pp ON pp.id = p.payroll_period_id
      WHERE pp.period_year = $1 AND pp.status = 'closed'
      GROUP BY pp.id, pp.period_month, pp.period_name
      ORDER BY pp.period_month
    `, [year]);
    return {
      title: 'Payroll Summary Report',
      filename: `payroll-summary-${year}.pdf`,
      filters: [{ label: 'Year', value: year }],
      sections: [{
        title: 'Payroll Periods',
        columns: [
          { key: 'period_name', label: 'Period', width: 140 },
          { key: 'employee_count', label: 'Employees', width: 80 },
          { key: 'gross_pay', label: 'Gross', type: 'currency', width: 110 },
          { key: 'deductions', label: 'Deductions', type: 'currency', width: 110 },
          { key: 'net_pay', label: 'Net', type: 'currency', width: 100 },
        ],
        rows: result.rows,
      }],
    };
  }

  if (type === 'balance-sheet') {
    const [assets, liabilities, equity] = await Promise.all([
      db.query("SELECT account_type, COALESCE(SUM(debit-credit),0) balance FROM financial_transactions ft JOIN chart_of_accounts a ON a.id=ft.account_id WHERE a.account_type='asset' GROUP BY account_type"),
      db.query("SELECT account_type, COALESCE(SUM(credit-debit),0) balance FROM financial_transactions ft JOIN chart_of_accounts a ON a.id=ft.account_id WHERE a.account_type='liability' GROUP BY account_type"),
      db.query("SELECT account_type, COALESCE(SUM(credit-debit),0) balance FROM financial_transactions ft JOIN chart_of_accounts a ON a.id=ft.account_id WHERE a.account_type='equity' GROUP BY account_type"),
    ]);
    const totalAssets = assets.rows.reduce((sum, row) => sum + Number(row.balance || 0), 0);
    const totalLiabilities = liabilities.rows.reduce((sum, row) => sum + Number(row.balance || 0), 0);
    const totalEquity = equity.rows.reduce((sum, row) => sum + Number(row.balance || 0), 0);
    return {
      title: 'Balance Sheet',
      filename: 'balance-sheet.pdf',
      summary: [
        { label: 'Total Assets', value: totalAssets, type: 'currency' },
        { label: 'Total Liabilities', value: totalLiabilities, type: 'currency' },
        { label: 'Total Equity', value: totalEquity, type: 'currency' },
      ],
      sections: [{
        title: 'Balance Sheet Lines',
        columns: [
          { key: 'line', label: 'Line', width: 220 },
          { key: 'amount', label: 'Amount', type: 'currency', width: 160 },
        ],
        rows: [
          { line: 'Assets', amount: totalAssets },
          { line: 'Liabilities', amount: totalLiabilities },
          { line: 'Equity', amount: totalEquity },
        ],
      }],
    };
  }

  return null;
};

exports.download = async (req, res) => {
  try {
    const report = await buildFinanceReport(req.params.type, req.query);
    if (!report) return res.status(404).json({ success: false, message: 'Unknown finance report type' });
    return sendPdfReport(res, {
      subtitle: `Prepared for ${req.user.email}`,
      ...report,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
