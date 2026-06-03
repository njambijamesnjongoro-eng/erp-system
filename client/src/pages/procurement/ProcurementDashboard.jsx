import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, FileText, Users, AlertTriangle, Package, DollarSign, CheckCircle, Clock, Plus, Eye } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { procurementDashboardService, inventoryService, approvalService } from '../../api/procurement';
import { formatCurrency, formatDate, getStatusColor } from '../../utils/helpers';
import { useAuth } from '../../hooks/useAuth';

const fmt = (n) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0);

export function ProcurementDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [requestsByStatus, setRequestsByStatus] = useState([]);
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(null);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [statsRes, statusRes, trendRes, pacRes, lowStockRes, pendAppRes] = await Promise.all([
          procurementDashboardService.getStats(),
          procurementDashboardService.getRequestsByStatus(),
          procurementDashboardService.getMonthlyTrend(),
          procurementDashboardService.getPendingApprovalsCount(),
          inventoryService.getLowStock(),
          approvalService.getPending(),
        ]);
        setStats(statsRes.data?.data || statsRes.data);
        setRequestsByStatus(statusRes.data?.data || statusRes.data || []);
        setMonthlyTrend(trendRes.data?.data || trendRes.data || []);
        setPendingApprovalsCount(pacRes.data?.data || pacRes.data);
        setLowStockItems(lowStockRes.data?.data || lowStockRes.data || []);
        setPendingApprovals(pendAppRes.data?.data || pendAppRes.data || []);
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

  const kpiCards = [
    { label: 'Pending Requests', value: stats?.pending_requests ?? 0, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total PO Value', value: fmt(stats?.total_po_value ?? 0), icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Active Suppliers', value: stats?.active_suppliers ?? 0, icon: Users, color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'Low Stock Items', value: stats?.low_stock_items ?? 0, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  const quickStats = [
    { label: 'Inventory Value', value: fmt(stats?.inventory_value ?? 0), icon: Package },
    { label: 'Pending Approvals', value: pendingApprovalsCount?.total ?? 0, sub: pendingApprovalsCount ? `${pendingApprovalsCount.my_role ?? 0} for you` : null, icon: CheckCircle },
    { label: 'Overdue Deliveries', value: stats?.overdue_deliveries ?? 0, icon: Clock },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Procurement & Inventory Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Overview of procurement activities and stock levels</p>
        </div>
        <div className="flex gap-3">
          <Link to="/procurement/requests?action=new" className="btn btn-primary inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Request
          </Link>
          <Link to="/procurement/orders?action=new" className="btn btn-secondary inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> New PO
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => {
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {quickStats.map((qs) => {
          const Icon = qs.icon;
          return (
            <div key={qs.label} className="card">
              <div className="card-body flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{qs.label}</p>
                  <p className="text-lg font-bold text-gray-900">{qs.value}</p>
                  {qs.sub && <p className="text-xs text-gray-400">{qs.sub}</p>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header"><h3 className="font-semibold">Requests by Status</h3></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={requestsByStatus}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h3 className="font-semibold">Monthly Spending Trend</h3></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `KES ${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => fmt(v)} />
                <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header flex justify-between items-center">
            <h3 className="font-semibold">Pending Approvals</h3>
            <Link to="/procurement/approvals" className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1">
              View All <Eye className="w-3 h-3" />
            </Link>
          </div>
          <div className="card-body p-0">
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Request#</th>
                    <th>Title</th>
                    <th>Requester</th>
                    <th>Urgency</th>
                    <th>Created</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {pendingApprovals.length === 0 && (
                    <tr><td colSpan={6} className="text-center text-gray-400 py-6">No pending approvals</td></tr>
                  )}
                  {pendingApprovals.map((appr) => (
                    <tr key={appr.id}>
                      <td className="font-mono text-sm">#{appr.request_number}</td>
                      <td className="max-w-[160px] truncate">{appr.title}</td>
                      <td>{appr.requester_name}</td>
                      <td>
                        <span className={`badge badge-${appr.urgency === 'critical' ? 'red' : appr.urgency === 'high' ? 'orange' : appr.urgency === 'medium' ? 'amber' : 'emerald'}`}>
                          {appr.urgency}
                        </span>
                      </td>
                      <td className="text-sm text-gray-500">{formatDate(appr.created_at)}</td>
                      <td>
                        <Link to={`/procurement/approvals?request=${appr.id}`} className="text-blue-600 hover:underline text-sm">
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-header flex justify-between items-center">
            <h3 className="font-semibold">Low Stock Alerts</h3>
            <Link to="/inventory" className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1">
              Manage <Eye className="w-3 h-3" />
            </Link>
          </div>
          <div className="card-body p-0">
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Item Code</th>
                    <th>Item Name</th>
                    <th>Current Qty</th>
                    <th>Reorder Point</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockItems.length === 0 && (
                    <tr><td colSpan={5} className="text-center text-gray-400 py-6">No low stock items</td></tr>
                  )}
                  {lowStockItems.map((item) => (
                    <tr key={item.id}>
                      <td className="font-mono text-sm">{item.item_code}</td>
                      <td>{item.name}</td>
                      <td className={item.current_qty <= item.reorder_point ? 'text-red-600 font-semibold' : ''}>
                        {item.current_qty}
                      </td>
                      <td>{item.reorder_point}</td>
                      <td>
                        <span className={`badge badge-${item.current_qty <= item.reorder_point ? 'red' : 'emerald'}`}>
                          {item.current_qty <= item.reorder_point ? 'Low Stock' : 'OK'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
