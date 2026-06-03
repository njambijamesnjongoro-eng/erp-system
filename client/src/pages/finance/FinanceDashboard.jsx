import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Briefcase, FileText, AlertTriangle, CreditCard, BarChart3, PieChart, Receipt } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RPie, Pie, Cell, LineChart, Line } from 'recharts';
import { financeDashboardService } from '../../api/finance';
import { formatCurrency, getStatusColor } from '../../utils/helpers';
import { useAuth } from '../../hooks/useAuth';
import { Link } from 'react-router-dom';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];

export function FinanceDashboard() {
  const { hasRole } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data: res } = await financeDashboardService.getStats();
        setData(res.data);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetch();
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;
  if (!data) return <div className="text-center py-20 text-gray-400">Unable to load finance dashboard</div>;

  const budgetChartData = [
    { name: 'Allocated', value: data.totalBudget || 0 },
    { name: 'Remaining', value: data.remainingBudget || 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Finance Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Financial overview and analytics</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={DollarSign} label="Monthly Expenses" value={formatCurrency(data.monthlyExpenses)} color="bg-red-500" />
        <MetricCard icon={Briefcase} label="Payroll This Month" value={formatCurrency(data.payrollTotal)} color="bg-indigo-500" />
        <MetricCard icon={BarChart3} label="Total Budget" value={formatCurrency(data.totalBudget)} color="bg-emerald-500" />
        <MetricCard icon={AlertTriangle} label="Pending Expenses" value={`${data.pendingExpenses?.count || 0} (${formatCurrency(data.pendingExpenses?.total || 0)})`} color="bg-amber-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <div className="card-header"><h3 className="font-semibold">Budget Allocation</h3></div>
          <div className="card-body h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[{ name: 'Allocated', amount: data.totalBudget }, { name: 'Remaining', amount: data.remainingBudget }, { name: 'Spent', amount: data.totalBudget - data.remainingBudget }]}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-800" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={v => `KSh ${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={v => formatCurrency(v)} />
                <Bar dataKey="amount" fill="#6366f1" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3 className="font-semibold">Active Loans</h3></div>
          <div className="card-body space-y-4">
            <div className="text-center py-4">
              <p className="text-3xl font-bold text-amber-500">{formatCurrency(data.activeLoans?.balance || 0)}</p>
              <p className="text-sm text-gray-500">Outstanding Balance</p>
            </div>
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-gray-500">Total Loans</span><span className="font-medium">{formatCurrency(data.activeLoans?.total || 0)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Count</span><span className="font-medium">{data.activeLoans?.count || 0}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Pending Invoices</span><span className="font-medium">{data.pendingInvoices?.count || 0}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Pending Taxes</span><span className="font-medium">{formatCurrency(data.pendingTaxes)}</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header"><h3 className="font-semibold">Recent Transactions</h3></div>
          <div className="card-body">
            {data.recentTransactions?.length > 0 ? (
              <div className="space-y-3">
                {data.recentTransactions.slice(0, 5).map(tx => (
                  <div key={tx.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{tx.description || 'Transaction'}</p>
                      <p className="text-xs text-gray-500">{new Date(tx.transaction_date).toLocaleDateString()}</p>
                    </div>
                    <span className={`font-medium ${tx.debit > 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {tx.debit > 0 ? `-${formatCurrency(tx.debit)}` : formatCurrency(tx.credit)}
                    </span>
                  </div>
                ))}
              </div>
            ) : <p className="text-gray-400 text-center py-8">No recent transactions</p>}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3 className="font-semibold">Quick Actions</h3></div>
          <div className="card-body grid grid-cols-2 gap-3">
            <QuickActionLink to="/finance/payroll" icon={Briefcase} label="Payroll" color="bg-indigo-500" />
            <QuickActionLink to="/finance/expenses" icon={Receipt} label="Expenses" color="bg-red-500" />
            <QuickActionLink to="/finance/budgets" icon={BarChart3} label="Budgets" color="bg-emerald-500" />
            <QuickActionLink to="/finance/taxes" icon={FileText} label="Taxes" color="bg-amber-500" />
            <QuickActionLink to="/finance/loans" icon={CreditCard} label="Loans" color="bg-violet-500" />
            <QuickActionLink to="/finance/reports" icon={PieChart} label="Reports" color="bg-cyan-500" />
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, color }) {
  return (
    <div className="card">
      <div className="card-body flex items-center gap-4">
        <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
}

function QuickActionLink({ to, icon: Icon, label, color }) {
  return (
    <Link to={to} className={`${color} text-white rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:opacity-90 transition-opacity`}>
      <Icon className="w-6 h-6" />
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}
