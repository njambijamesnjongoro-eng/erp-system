const db = require('../../config/db');

exports.getDashboardStats = async (req, res) => {
  try {
    const [
      expenseTotal, budgetStats, payrollTotal, pendingExpenses,
      activeLoans, invoiceStats, taxTotal, recentTransactions
    ] = await Promise.all([
      db.query("SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE expense_date >= date_trunc('month', CURRENT_DATE)"),
      db.query("SELECT COUNT(*) as count, COALESCE(SUM(total_amount),0) as total, COALESCE(SUM(remaining_amount),0) as remaining FROM budgets WHERE fiscal_year = EXTRACT(YEAR FROM CURRENT_DATE)"),
      db.query("SELECT COALESCE(SUM(net_pay),0) as total FROM payroll WHERE payment_status IN ('paid','pending') AND created_at >= date_trunc('month', CURRENT_DATE)"),
      db.query("SELECT COUNT(*) as count, COALESCE(SUM(amount),0) as total FROM expenses WHERE status = 'pending'"),
      db.query("SELECT COUNT(*) as count, COALESCE(SUM(principal_amount),0) as total, COALESCE(SUM(balance),0) as balance FROM loans WHERE status = 'active'"),
      db.query("SELECT COUNT(*) as count, COALESCE(SUM(amount),0) as total FROM invoices WHERE status = 'pending'"),
      db.query("SELECT COALESCE(SUM(amount),0) as total FROM tax_records WHERE status IN ('pending','overdue')"),
      db.query("SELECT * FROM financial_transactions ORDER BY created_at DESC LIMIT 10"),
    ]);

    res.json({
      success: true,
      data: {
        monthlyExpenses: parseFloat(expenseTotal.rows[0].total),
        totalBudget: parseFloat(budgetStats.rows[0].total),
        remainingBudget: parseFloat(budgetStats.rows[0].remaining),
        budgetCount: parseInt(budgetStats.rows[0].count),
        payrollTotal: parseFloat(payrollTotal.rows[0].total),
        pendingExpenses: { count: parseInt(pendingExpenses.rows[0].count), total: parseFloat(pendingExpenses.rows[0].total) },
        activeLoans: { count: parseInt(activeLoans.rows[0].count), total: parseFloat(activeLoans.rows[0].total), balance: parseFloat(activeLoans.rows[0].balance) },
        pendingInvoices: { count: parseInt(invoiceStats.rows[0].count), total: parseFloat(invoiceStats.rows[0].total) },
        pendingTaxes: parseFloat(taxTotal.rows[0].total),
        recentTransactions: recentTransactions.rows,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
