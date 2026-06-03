import { useState, useEffect } from 'react';
import {
  Users, Building2, UserCheck, Briefcase, TrendingUp,
  DollarSign, Activity, Clock,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../hooks/useAuth';

const stats = [
  { label: 'Total Employees', value: '0', icon: Users, color: 'bg-blue-500', change: '+12%' },
  { label: 'Active Departments', value: '0', icon: Building2, color: 'bg-emerald-500', change: '+2' },
  { label: 'Present Today', value: '0', icon: UserCheck, color: 'bg-violet-500', change: '92%' },
  { label: 'Open Positions', value: '0', icon: Briefcase, color: 'bg-amber-500', change: '-3' },
];

const chartData = [
  { month: 'Jan', employees: 0, revenue: 0 },
  { month: 'Feb', employees: 0, revenue: 0 },
  { month: 'Mar', employees: 0, revenue: 0 },
  { month: 'Apr', employees: 0, revenue: 0 },
  { month: 'May', employees: 0, revenue: 0 },
  { month: 'Jun', employees: 0, revenue: 0 },
];

const recentActivities = [
  { action: 'System initialized', time: 'Just now', type: 'system' },
];

export function Dashboard() {
  const { user } = useAuth();
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{greeting}, {user?.full_name || user?.email}</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Here's what's happening in your organization.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className={`p-3 rounded-lg ${stat.color} bg-opacity-10`}>
              <stat.icon className={`w-6 h-6 text-${stat.color.replace('bg-', '')}`} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold">{stat.value}</p>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{stat.change}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <div className="card-header">
            <h3 className="font-semibold">Organization Growth</h3>
          </div>
          <div className="card-body">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-800" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="employees" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold">Recent Activity</h3>
          </div>
          <div className="card-body p-0">
            {recentActivities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Activity className="w-8 h-8 mb-2" />
                <p className="text-sm">No recent activity</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {recentActivities.map((activity, i) => (
                  <div key={i} className="flex items-center gap-3 px-6 py-3">
                    <div className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{activity.action}</p>
                      <p className="text-xs text-gray-400">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <Clock className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-xs text-gray-400">Your Role</p>
            <p className="text-sm font-medium">{user?.role_name}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <Building2 className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-xs text-gray-400">Department</p>
            <p className="text-sm font-medium">{user?.department_name || '-'}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <Briefcase className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-xs text-gray-400">Position</p>
            <p className="text-sm font-medium">{user?.position || '-'}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <DollarSign className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-xs text-gray-400">Status</p>
            <p className="text-sm font-medium capitalize">{user?.employment_status || 'Active'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
