import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, Truck, Wrench, Shield, AlertTriangle, DollarSign, BarChart3, Activity, Plus, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { assetDashboardService } from '../../api/assets';
import { formatCurrency, getStatusColor } from '../../utils/helpers';
import { useAuth } from '../../hooks/useAuth';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];

export function AssetDashboard() {
  const { hasRole } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const canManage = hasRole('System Admin', 'CEO', 'Asset Manager');

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data: res } = await assetDashboardService.getStats();
        setData(res.data);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetch();
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;
  if (!data) return <div className="text-center py-20 text-gray-400">Unable to load asset dashboard</div>;

  const statusPie = data.byStatus?.map(s => ({ name: s.status, value: parseInt(s.count) })) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Asset & Fleet Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Complete asset lifecycle management overview</p>
        </div>
        {canManage && (
          <Link to="/assets/new" className="btn-primary gap-2"><Plus className="w-4 h-4" /> Add Asset</Link>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={Package} label="Total Assets" value={data.assets?.total || 0} sub={`${data.assets?.available || 0} available, ${data.assets?.assigned || 0} assigned`} color="bg-indigo-500" />
        <MetricCard icon={DollarSign} label="Total Value" value={formatCurrency(data.values?.current_value || 0)} sub={`Cost: ${formatCurrency(data.values?.total_cost || 0)}`} color="bg-emerald-500" />
        <MetricCard icon={Truck} label="Vehicles" value={data.fleet?.total_vehicles || 0} sub={`${data.fleet?.active_vehicles || 0} active, ${Math.round(data.fleet?.avg_mileage || 0).toLocaleString()} avg km`} color="bg-amber-500" />
        <MetricCard icon={Wrench} label="Maintenance" value={data.maintenance?.in_progress || 0} sub={`${data.overdueAlerts?.length || 0} overdue, ${formatCurrency(data.maintenance?.total_cost || 0)} YTD`} color="bg-red-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <div className="card-header"><h3 className="font-semibold">Assets by Category</h3></div>
          <div className="card-body h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.byCategory || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-800" />
                <XAxis dataKey="category_name" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => `KSh ${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={v => formatCurrency(v)} />
                <Bar dataKey="total_value" name="Value" fill="#6366f1" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3 className="font-semibold">Asset Status</h3></div>
          <div className="card-body h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusPie} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {statusPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header"><h3 className="font-semibold">Insurance Overview</h3></div>
          <div className="card-body space-y-3">
            <div className="flex justify-between py-2 border-b"><span className="text-gray-500">Active Policies</span><span className="font-medium">{data.insurance?.active_policies || 0}</span></div>
            <div className="flex justify-between py-2 border-b"><span className="text-gray-500">Total Premium</span><span className="font-medium">{formatCurrency(data.insurance?.total_premium || 0)}</span></div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-500">Expiring Soon</span>
              <span className={`font-medium ${(data.insurance?.expiring_soon || 0) > 0 ? 'text-red-500' : 'text-green-500'}`}>{data.insurance?.expiring_soon || 0}</span>
            </div>
            <Link to="/assets/insurance" className="btn-secondary w-full mt-2 justify-center">Manage Insurance</Link>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3 className="font-semibold">Overdue Maintenance</h3></div>
          <div className="card-body">
            {data.overdueAlerts?.length > 0 ? (
              <div className="space-y-2">
                {data.overdueAlerts.slice(0, 5).map(m => (
                  <div key={m.id} className="flex items-center gap-3 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.title}</p>
                      <p className="text-xs text-gray-500">{m.asset_name || m.registration_number}</p>
                    </div>
                    <span className="text-xs text-red-500">{new Date(m.scheduled_date).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-center text-gray-400 py-4"><Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />No overdue maintenance</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <QuickActionLink to="/assets" icon={Package} label="All Assets" color="bg-indigo-500" />
        <QuickActionLink to="/assets/fleet" icon={Truck} label="Fleet" color="bg-amber-500" />
        <QuickActionLink to="/assets/maintenance" icon={Wrench} label="Maintenance" color="bg-red-500" />
        <QuickActionLink to="/assets/spare-parts" icon={BarChart3} label="Spare Parts" color="bg-cyan-500" />
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="card">
      <div className="card-body flex items-center gap-4">
        <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-xl font-bold truncate">{value}</p>
          <p className="text-xs text-gray-400 truncate">{sub}</p>
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
