import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, DollarSign, Clock, Activity, TrendingUp, BarChart3,
  FileText, Bell, Shield, AlertTriangle, CheckCircle, Eye,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { dashboardService } from '../../api/analytics';
import { formatDate } from '../../utils/helpers';
import { useAuth } from '../../hooks/useAuth';

const fmt = (n) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0);

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export function ExecutiveDashboard() {
  const { user } = useAuth();
  const [kpiCards, setKpiCards] = useState([]);
  const [execSummary, setExecSummary] = useState(null);
  const [revenueTrend, setRevenueTrend] = useState([]);
  const [deptHeadcount, setDeptHeadcount] = useState([]);
  const [expenseDist, setExpenseDist] = useState([]);
  const [budgetUtil, setBudgetUtil] = useState([]);
  const [activityFeed, setActivityFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [kpiRes, sumRes, finRes, deptRes, cmpRes] = await Promise.all([
          dashboardService.getKpiCards(),
          dashboardService.getExecutiveSummary(),
          dashboardService.getFinancialStats(),
          dashboardService.getEmployeeStats(),
          dashboardService.getComplianceStats(),
        ]);
        setKpiCards(kpiRes.data?.data || kpiRes.data || []);
        setExecSummary(sumRes.data?.data || sumRes.data);
        const fin = finRes.data?.data || finRes.data || {};
        setRevenueTrend(fin.revenue_trend || []);
        setExpenseDist(fin.expense_distribution || []);
        setBudgetUtil(fin.budget_utilization || []);
        const dept = deptRes.data?.data || deptRes.data || {};
        setDeptHeadcount(dept.department_headcount || []);
        const cmp = cmpRes.data?.data || cmpRes.data || {};
        setActivityFeed(cmp.activity_feed || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="spinner" /></div>;
  if (error) return <div className="text-red-500 p-4">Error loading dashboard: {error}</div>;

  const defaultKpis = [
    { label: 'Total Employees', value: execSummary?.total_employees ?? 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Active Payroll', value: fmt(execSummary?.active_payroll ?? 0), icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Pending Approvals', value: execSummary?.pending_approvals ?? 0, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'System Health', value: execSummary?.system_health ?? 'Healthy', icon: Shield, color: 'text-violet-600', bg: 'bg-violet-50' },
  ];

  const displayKpis = kpiCards.length > 0 ? kpiCards : defaultKpis;

  const quickActions = [
    { label: 'View Reports', icon: FileText, to: '/analytics/reports', color: 'bg-blue-50 text-blue-600' },
    { label: 'Notifications', icon: Bell, to: '/analytics/notifications', color: 'bg-amber-50 text-amber-600' },
    { label: 'System Health', icon: Activity, to: '/analytics/system-health', color: 'bg-emerald-50 text-emerald-600' },
    { label: 'BI Insights', icon: TrendingUp, to: '/analytics/bi-insights', color: 'bg-violet-50 text-violet-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Executive Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Welcome back, {user?.full_name || user?.email} ({user?.role_name})
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {displayKpis.map((kpi) => {
          const Icon = kpi.icon;
          const color = kpi.color || 'text-gray-600';
          const bg = kpi.bg || 'bg-gray-50';
          return (
            <div key={kpi.label} className="card">
              <div className="card-body flex items-center gap-4">
                <div className={`w-12 h-12 rounded-lg ${bg} flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${color}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{kpi.label}</p>
                  <p className={`text-xl font-bold ${color}`}>{kpi.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header"><h3 className="font-semibold">Revenue Trend</h3></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={revenueTrend.length > 0 ? revenueTrend : [{ month: 'Jan', revenue: 0, expense: 0, profit: 0 }]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => fmt(v)} />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="expense" stroke="#EF4444" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h3 className="font-semibold">Department Headcount</h3></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={deptHeadcount.length > 0 ? deptHeadcount : [{ department: 'N/A', count: 0 }]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="department" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header"><h3 className="font-semibold">Expense Distribution</h3></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={expenseDist.length > 0 ? expenseDist : [{ name: 'No Data', value: 1 }]}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {expenseDist.map((_, idx) => (
                    <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h3 className="font-semibold">Budget Utilization</h3></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={budgetUtil.length > 0 ? budgetUtil : [{ department: 'N/A', budget: 0, spent: 0 }]} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="department" tick={{ fontSize: 11 }} width={100} />
                <Tooltip formatter={(v) => fmt(v)} />
                <Legend />
                <Bar dataKey="budget" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                <Bar dataKey="spent" fill="#10B981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.label} to={action.to} className="card hover:shadow-md transition-shadow">
              <div className="card-body flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${action.color} flex items-center justify-center`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="font-medium text-gray-700">{action.label}</span>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold">Recent Activity</h3>
        </div>
        <div className="card-body p-0">
          {activityFeed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Activity className="w-8 h-8 mb-2" />
              <p className="text-sm">No recent activity</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {activityFeed.map((act, i) => (
                <div key={act.id || i} className="flex items-center gap-3 px-6 py-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{act.description || act.action}</p>
                    <p className="text-xs text-gray-400">{act.user_name} &middot; {formatDate(act.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
