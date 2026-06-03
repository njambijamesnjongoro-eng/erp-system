import { useState, useEffect } from 'react';
import {
  TrendingUp, Users, Building2, BarChart3, DollarSign,
  UserCheck, Clock, Percent, Target,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { analyticsService } from '../../api/analytics';
import { formatDate } from '../../utils/helpers';
import { useAuth } from '../../hooks/useAuth';

const fmt = (n) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0);

const TABS = ['Revenue', 'Employees', 'Departments', 'Year-over-Year'];

export function AnalyticsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('Revenue');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [revenueData, setRevenueData] = useState([]);
  const [employeeData, setEmployeeData] = useState([]);
  const [deptData, setDeptData] = useState([]);
  const [yoyData, setYoyData] = useState([]);
  const [employeeKpis, setEmployeeKpis] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const params = { month, year };
        const [revRes, empRes, deptRes, yoyRes] = await Promise.all([
          analyticsService.getRevenueTrends(params),
          analyticsService.getKpiRecords({ type: 'employee', ...params }),
          analyticsService.getDepartmentComparison(params),
          analyticsService.getYearOverYear({ metric: 'revenue', ...params }),
        ]);
        setRevenueData(revRes.data?.data || revRes.data || []);
        const emp = empRes.data?.data || empRes.data || {};
        setEmployeeData(emp.headcount || []);
        setEmployeeKpis(emp.kpis || {});
        setDeptData(deptRes.data?.data || deptRes.data || []);
        setYoyData(yoyRes.data?.data || yoyRes.data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [month, year]);

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="spinner" /></div>;
  if (error) return <div className="text-red-500 p-4">Error loading analytics: {error}</div>;

  const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: new Date(0, i).toLocaleString('default', { month: 'long' }) }));
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  const renderTabNav = () => (
    <div className="flex gap-2 border-b border-gray-200 mb-6">
      {TABS.map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === tab
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );

  const renderDateFilter = () => (
    <div className="flex gap-3 items-center">
      <select className="select" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
        {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
      </select>
      <select className="select" value={year} onChange={(e) => setYear(Number(e.target.value))}>
        {years.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">Deep dive into organizational metrics</p>
        </div>
        {renderDateFilter()}
      </div>

      {renderTabNav()}

      {activeTab === 'Revenue' && (
        <div className="space-y-6">
          <div className="card">
            <div className="card-header"><h3 className="font-semibold">Revenue, Expenses & Profit</h3></div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={revenueData.length > 0 ? revenueData : [{ month: 'Jan', revenue: 0, expense: 0, profit: 0 }]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => fmt(v)} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} name="Revenue" />
                  <Line type="monotone" dataKey="expense" stroke="#EF4444" strokeWidth={2} dot={{ r: 3 }} name="Expense" />
                  <Line type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} name="Profit" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Employees' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Turnover Rate', value: employeeKpis?.turnover_rate ?? '0%', icon: Percent, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Attendance Rate', value: employeeKpis?.attendance_rate ?? '0%', icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Avg Tenure', value: employeeKpis?.avg_tenure ?? '0 yrs', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'Open Positions', value: employeeKpis?.open_positions ?? 0, icon: Target, color: 'text-violet-600', bg: 'bg-violet-50' },
            ].map((kpi) => {
              const Icon = kpi.icon;
              return (
                <div key={kpi.label} className="card">
                  <div className="card-body flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-lg ${kpi.bg} flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 ${kpi.color}`} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">{kpi.label}</p>
                      <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="card">
            <div className="card-header"><h3 className="font-semibold">Department Headcount</h3></div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={employeeData.length > 0 ? employeeData : [{ department: 'N/A', count: 0 }]}>
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
      )}

      {activeTab === 'Departments' && (
        <div className="space-y-6">
          <div className="card">
            <div className="card-header"><h3 className="font-semibold">Department Comparison</h3></div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={deptData.length > 0 ? deptData : [{ department: 'N/A', revenue: 0, expenses: 0, headcount: 0 }]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="department" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip formatter={(v) => typeof v === 'number' ? fmt(v) : v} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Revenue" />
                  <Bar dataKey="expenses" fill="#EF4444" radius={[4, 4, 0, 0]} name="Expenses" />
                  <Bar dataKey="headcount" fill="#10B981" radius={[4, 4, 0, 0]} name="Headcount" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Year-over-Year' && (
        <div className="space-y-6">
          <div className="card">
            <div className="card-header"><h3 className="font-semibold">Year-over-Year Comparison</h3></div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={yoyData.length > 0 ? yoyData : [{ year: new Date().getFullYear(), revenue: 0, previous: 0 }]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => fmt(v)} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2} dot={{ r: 4 }} name="Current Year" />
                  <Line type="monotone" dataKey="previous" stroke="#94A3B8" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4 }} name="Previous Year" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
