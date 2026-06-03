import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, BarChart3, PieChart, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { reportService } from '../../api/finance';
import { formatCurrency, formatDate } from '../../utils/helpers';

export function ReportsPage() {
  const [activeReport, setActiveReport] = useState('pl');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [params, setParams] = useState({ from_date: `${new Date().getFullYear()}-01-01`, to_date: new Date().toISOString().split('T')[0], fiscal_year: new Date().getFullYear() });

  const fetchReport = async () => {
    setLoading(true);
    try {
      let res;
      switch (activeReport) {
        case 'pl': res = await reportService.profitLoss(params); break;
        case 'expenses': res = await reportService.expenseReport(params); break;
        case 'budgets': res = await reportService.budgetReport(params); break;
        case 'taxes': res = await reportService.taxSummary(params); break;
        case 'payroll': res = await reportService.payrollSummary(params); break;
        case 'bs': res = await reportService.balanceSheet(); break;
        default: res = { data: { data: null } };
      }
      setData(res.data?.data || res.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchReport(); }, [activeReport, params]);

  const reports = [
    { key: 'pl', label: 'Profit & Loss', icon: TrendingUp },
    { key: 'expenses', label: 'Expense Report', icon: BarChart3 },
    { key: 'budgets', label: 'Budget Report', icon: PieChart },
    { key: 'taxes', label: 'Tax Summary', icon: TrendingDown },
    { key: 'payroll', label: 'Payroll Summary', icon: BarChart3 },
    { key: 'bs', label: 'Balance Sheet', icon: PieChart },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Financial Reports</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">View and export financial reports</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {reports.map(r => (
          <button key={r.key} onClick={() => setActiveReport(r.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeReport === r.key ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>
            <r.icon className="w-4 h-4 inline mr-1.5" />{r.label}
          </button>
        ))}
      </div>

      {activeReport !== 'bs' && (
        <div className="flex flex-wrap gap-4 items-center">
          <div><label className="block text-xs mb-1">From</label><input type="date" value={params.from_date||''} onChange={e => setParams({...params, from_date: e.target.value})} className="input-field text-sm" /></div>
          <div><label className="block text-xs mb-1">To</label><input type="date" value={params.to_date||''} onChange={e => setParams({...params, to_date: e.target.value})} className="input-field text-sm" /></div>
          {activeReport === 'budgets' && <div><label className="block text-xs mb-1">Year</label><input type="number" value={params.fiscal_year||''} onChange={e => setParams({...params, fiscal_year: parseInt(e.target.value)})} className="input-field text-sm w-24" /></div>}
        </div>
      )}

      {loading && <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>}

      {!loading && activeReport === 'pl' && data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card"><div className="card-body text-center"><p className="text-sm text-gray-500">Total Income</p><p className="text-2xl font-bold text-green-500">{formatCurrency(data.totalIncome)}</p></div></div>
          <div className="card"><div className="card-body text-center"><p className="text-sm text-gray-500">Total Expenses</p><p className="text-2xl font-bold text-red-500">{formatCurrency(data.totalExpenses)}</p></div></div>
          <div className="card"><div className="card-body text-center"><p className="text-sm text-gray-500">Net Profit</p><p className={`text-2xl font-bold ${data.netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>{formatCurrency(data.netProfit)}</p><p className="text-xs text-gray-400">Margin: {data.profitMargin}%</p></div></div>
        </div>
      )}

      {!loading && activeReport === 'expenses' && data && (
        <div className="card">
          <div className="card-header"><h3 className="font-semibold">Expenses by Category</h3></div>
          <div className="card-body">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.groups || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-800" />
                  <XAxis dataKey="group_name" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={v => `KSh ${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={v => formatCurrency(v)} />
                  <Bar dataKey="total" fill="#ef4444" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {data.groups?.map(g => (
                <div key={g.group_name} className="flex justify-between text-sm py-1 border-b">
                  <span>{g.group_name} <span className="text-gray-400">({g.count})</span></span>
                  <span className="font-medium">{formatCurrency(g.total)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-bold pt-2">
                <span>Grand Total</span><span>{formatCurrency(data.grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && activeReport === 'budgets' && data && (
        <div className="grid gap-4">
          {data.map(b => (
            <div key={b.id} className="card"><div className="card-body">
              <div className="flex justify-between mb-2"><span className="font-medium">{b.budget_name}</span><span className="text-sm text-gray-500">{b.department_name}</span></div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div><span className="text-gray-500">Allocated: </span><span className="font-medium">{formatCurrency(b.allocated_amount)}</span></div>
                <div><span className="text-gray-500">Spent: </span><span className="font-medium text-red-500">{formatCurrency(b.spent_amount)}</span></div>
                <div><span className="text-gray-500">Utilization: </span><span className="font-medium">{parseFloat(b.utilization_pct).toFixed(1)}%</span></div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2"><div className="bg-primary-600 h-2 rounded-full" style={{width:`${Math.min(parseFloat(b.utilization_pct),100)}%`}} /></div>
            </div></div>
          ))}
        </div>
      )}

      {!loading && activeReport === 'taxes' && data && (
        <div className="card"><div className="card-body">
          <div className="overflow-x-auto">
            <table className="data-table"><thead><tr><th>Tax Type</th><th>Count</th><th>Total</th><th>Paid</th><th>Outstanding</th></tr></thead>
              <tbody>{data.map(t => (
                <tr key={t.tax_type}><td className="font-medium">{t.tax_type}</td><td>{t.count}</td><td>{formatCurrency(t.total)}</td><td>{formatCurrency(t.paid)}</td><td className="text-red-500 font-medium">{formatCurrency(t.outstanding)}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </div></div>
      )}

      {!loading && activeReport === 'payroll' && data && (
        <div className="card"><div className="card-body">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-800" />
                <XAxis dataKey="period_name" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => `KSh ${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={v => formatCurrency(v)} />
                <Bar dataKey="gross_pay" name="Gross" fill="#6366f1" radius={[4,4,0,0]} />
                <Bar dataKey="deductions" name="Deductions" fill="#ef4444" radius={[4,4,0,0]} />
                <Bar dataKey="net_pay" name="Net" fill="#10b981" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div></div>
      )}

      {!loading && activeReport === 'bs' && data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card"><div className="card-body text-center"><p className="text-sm text-gray-500">Total Assets</p><p className="text-2xl font-bold text-blue-500">{formatCurrency(data.assets)}</p></div></div>
          <div className="card"><div className="card-body text-center"><p className="text-sm text-gray-500">Total Liabilities</p><p className="text-2xl font-bold text-amber-500">{formatCurrency(data.liabilities)}</p></div></div>
          <div className="card"><div className="card-body text-center"><p className="text-sm text-gray-500">Total Equity</p><p className="text-2xl font-bold text-green-500">{formatCurrency(data.equity)}</p><p className="text-xs text-gray-400">A - L = {formatCurrency(data.assets - data.liabilities)}</p></div></div>
        </div>
      )}
    </div>
  );
}
