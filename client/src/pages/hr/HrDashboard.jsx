import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Building2, Calendar, Clock, Briefcase, Activity,
  TrendingUp, AlertTriangle, UserCheck, BookOpen, FileText,
  DollarSign, Plus
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { hrDashboardService, employeeService } from '../../api/hr';
import { formatDate, getStatusColor } from '../../utils/helpers';
import { useAuth } from '../../hooks/useAuth';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];

export function HrDashboard() {
  const { user, hasRole } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: overview } = await hrDashboardService.getOverview();
        setData(overview.data);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
    </div>
  );

  if (!data) return (
    <div className="text-center py-20 text-gray-400">
      <Activity className="w-16 h-16 mx-auto mb-4 opacity-50" />
      <p className="text-lg">Unable to load HR dashboard</p>
    </div>
  );

  const { totals={}, attendance=[], employeesByDepartment=[], contractExpiring=[], insuranceExpiring=[], trainingCompliance=null, leaveStats=[], recentHires=[] } = data || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">HR Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Human resources overview and analytics</p>
        </div>
        {hasRole('System Admin', 'CEO', 'HR Officer') && (
          <Link to="/hr/employees/new" className="btn-primary gap-2">
            <Plus className="w-4 h-4" /> Add Employee
          </Link>
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={Users} label="Total Employees" value={totals.employees} change="all time" color="bg-blue-500" />
        <MetricCard icon={UserCheck} label="Active" value={totals.active} change="current" color="bg-emerald-500" />
        <MetricCard icon={Building2} label="Departments" value={totals.departments} change="active" color="bg-violet-500" />
        <MetricCard icon={Calendar} label="Pending Leaves" value={totals.pendingLeaves} change="awaiting approval" color="bg-amber-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Employees by Department */}
        <div className="card lg:col-span-2">
          <div className="card-header">
            <h3 className="font-semibold">Employees by Department</h3>
          </div>
          <div className="card-body">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={employeesByDepartment}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-800" />
                  <XAxis dataKey="name" className="text-xs" tick={{ fontSize: 11 }} />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="employee_count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Training Compliance */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold">Training Compliance</h3>
          </div>
          <div className="card-body">
            {trainingCompliance && (
              <div className="space-y-4">
                <div className="flex items-center justify-center h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={[
                        { name: 'Completed', value: parseInt(trainingCompliance.completed) },
                        { name: 'In Progress', value: parseInt(trainingCompliance.in_progress) },
                        { name: 'Expired', value: parseInt(trainingCompliance.expired) },
                      ]} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                        dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {[0, 1, 2].map(i => <Cell key={i} fill={COLORS[i]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div><p className="font-bold text-emerald-600">{trainingCompliance.completed}</p><p className="text-gray-400">Completed</p></div>
                  <div><p className="font-bold text-blue-600">{trainingCompliance.in_progress}</p><p className="text-gray-400">In Progress</p></div>
                  <div><p className="font-bold text-red-600">{trainingCompliance.expired}</p><p className="text-gray-400">Expired</p></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alerts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contract Expiring */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Contracts Expiring (30 days)
            </h3>
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{contractExpiring.length}</span>
          </div>
          <div className="card-body p-0">
            {contractExpiring.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">No contracts expiring soon</p>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {contractExpiring.map(c => (
                  <div key={c.id} className="flex items-center justify-between px-6 py-3">
                    <div>
                      <p className="text-sm font-medium">{c.full_name}</p>
                      <p className="text-xs text-gray-400">{c.position} · {c.department_name}</p>
                    </div>
                    <span className="text-xs text-red-600 font-medium">{formatDate(c.contract_end_date)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Insurance Expiring */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Insurance Expiring (30 days)
            </h3>
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{insuranceExpiring.length}</span>
          </div>
          <div className="card-body p-0">
            {insuranceExpiring.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">No insurance policies expiring soon</p>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {insuranceExpiring.map(i => (
                  <div key={i.id} className="flex items-center justify-between px-6 py-3">
                    <div>
                      <p className="text-sm font-medium">{i.full_name}</p>
                      <p className="text-xs text-gray-400">{i.insurance_type} · {i.provider}</p>
                    </div>
                    <span className="text-xs text-red-600 font-medium">{formatDate(i.coverage_end_date)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Leave Stats & Recent Hires */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold">Leave Statistics (This Year)</h3>
          </div>
          <div className="card-body p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 text-left">
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Leave Type</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Total</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Approved</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Pending</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Days Taken</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {leaveStats.map(ls => (
                    <tr key={ls.code}>
                      <td className="px-6 py-3 text-sm">{ls.name}</td>
                      <td className="px-6 py-3 text-sm">{ls.total_requests}</td>
                      <td className="px-6 py-3 text-sm text-emerald-600 font-medium">{ls.approved}</td>
                      <td className="px-6 py-3 text-sm text-amber-600 font-medium">{ls.pending}</td>
                      <td className="px-6 py-3 text-sm">{ls.total_days_taken}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold">Recent Hires</h3>
          </div>
          <div className="card-body p-0">
            {recentHires.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">No recent hires</p>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {recentHires.map(h => (
                  <div key={h.id} className="flex items-center justify-between px-6 py-3">
                    <div>
                      <p className="text-sm font-medium">{h.full_name}</p>
                      <p className="text-xs text-gray-400">{h.position} · {h.department_name}</p>
                    </div>
                    <span className="text-xs text-gray-500">{formatDate(h.date_hired)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="card">
        <div className="card-header"><h3 className="font-semibold">Quick Actions</h3></div>
        <div className="card-body">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <QuickLink to="/hr/employees" icon={Users} label="Employee Directory" />
            <QuickLink to="/hr/attendance" icon={Clock} label="Attendance" />
            <QuickLink to="/hr/leave" icon={Calendar} label="Leave Management" />
            <QuickLink to="/hr/training" icon={BookOpen} label="Training" />
            <QuickLink to="/hr/insurance" icon={DollarSign} label="Insurance" />
            <QuickLink to="/hr/performance" icon={Activity} label="Performance" />
            <QuickLink to="/hr/documents" icon={FileText} label="Documents" />
            <QuickLink to="/hr/onboarding" icon={UserCheck} label="Onboarding" />
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, change, color }) {
  return (
    <div className="stat-card">
      <div className={`p-3 rounded-lg ${color} bg-opacity-10`}>
        <Icon className={`w-6 h-6 text-${color.replace('bg-', '')}`} />
      </div>
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold">{value}</p>
          <span className="text-xs text-gray-400">{change}</span>
        </div>
      </div>
    </div>
  );
}

function QuickLink({ to, icon: Icon, label }) {
  return (
    <Link to={to} className="flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <Icon className="w-6 h-6 text-primary-600" />
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}
