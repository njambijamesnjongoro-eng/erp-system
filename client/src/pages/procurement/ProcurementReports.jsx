import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { FileText, Download, TrendingUp, DollarSign, Package, Users, Award, AlertTriangle, Calendar } from 'lucide-react';
import { procurementDashboardService, supplierService, inventoryService } from '../../api/procurement';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { downloadBlob } from '../../utils/download';
import { useAuth } from '../../hooks/useAuth';

const fmt = (n) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(n || 0);

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export function ProcurementReports() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  const [deptSpending, setDeptSpending] = useState([]);
  const [topSuppliers, setTopSuppliers] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [stockValue, setStockValue] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [expiringContracts, setExpiringContracts] = useState([]);
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [downloading, setDownloading] = useState(false);

  const tabs = ['overview', 'stock', 'supplier', 'spend'];

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [statsRes, trendRes, deptRes, suppliersRes, topSuppliersRes] = await Promise.all([
          procurementDashboardService.getStats(),
          procurementDashboardService.getMonthlyTrend(),
          procurementDashboardService.getSpendingByDepartment(),
          supplierService.list({ limit: 200 }),
          procurementDashboardService.getTopSuppliers(),
        ]);
        setStats(statsRes.data?.data || statsRes.data);
        setMonthlyTrend(trendRes.data?.data || trendRes.data || []);
        setDeptSpending(deptRes.data?.data || deptRes.data || []);
        setSuppliers(suppliersRes.data?.data || []);
        setTopSuppliers(topSuppliersRes.data?.data || topSuppliersRes.data || []);

        const [lowStockRes, stockValRes, contractsRes] = await Promise.all([
          inventoryService.getLowStock().catch(() => ({ data: [] })),
          inventoryService.getStockValue().catch(() => ({ data: null })),
          supplierService.getExpiringContracts().catch(() => ({ data: [] })),
        ]);
        setLowStock(lowStockRes.data?.data || lowStockRes.data || []);
        setStockValue(stockValRes.data?.data || stockValRes.data);
        setExpiringContracts(contractsRes.data?.data || contractsRes.data || []);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    load();
  }, []);

  const KpiCard = ({ title, value, icon: Icon, color }) => (
    <div className="card">
      <div className="card-body flex items-center gap-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const res = await procurementDashboardService.downloadReportPdf(activeTab, {
        from_date: dateFrom || undefined,
        to_date: dateTo || undefined,
        department: departmentFilter || undefined,
        supplier_id: supplierFilter || undefined,
      });
      downloadBlob(res, `procurement-${activeTab}.pdf`);
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to download PDF report');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Procurement Reports</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Analytics and insights</p>
        </div>
        <button onClick={handleDownloadPdf} disabled={downloading} className="btn-secondary gap-2 disabled:opacity-50">
          <Download className="w-4 h-4" /> {downloading ? 'Preparing...' : 'Download PDF'}
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input-field pl-10" />
        </div>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input-field pl-10" />
        </div>
        <select value={departmentFilter} onChange={e => setDepartmentFilter(e.target.value)} className="input-field w-44">
          <option value="">All Departments</option>
          {deptSpending.map((d, i) => <option key={i} value={d.department}>{d.department}</option>)}
        </select>
        <select value={supplierFilter} onChange={e => setSupplierFilter(e.target.value)} className="input-field w-44">
          <option value="">All Suppliers</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-3 text-sm font-medium capitalize border-b-2 ${activeTab === tab ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {tab === 'overview' && 'Overview'}
            {tab === 'stock' && 'Stock Report'}
            {tab === 'supplier' && 'Supplier Report'}
            {tab === 'spend' && 'Spend Analysis'}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard title="Total PO Value (YTD)" value={fmt(stats?.total_po_value_ytd || 0)} icon={DollarSign} color="bg-emerald-500" />
            <KpiCard title="Total Items" value={stats?.total_items ?? 0} icon={Package} color="bg-blue-500" />
            <KpiCard title="Avg PO Value" value={fmt(stats?.avg_po_value || 0)} icon={TrendingUp} color="bg-purple-500" />
            <KpiCard title="Top Supplier" value={stats?.top_supplier || 'N/A'} icon={Award} color="bg-amber-500" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <div className="card-body">
                <h3 className="font-semibold mb-4">Procurement Trend</h3>
                {monthlyTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={monthlyTrend}>
                      <defs>
                        <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" tickFormatter={m => months[m - 1] || m} />
                      <YAxis tickFormatter={v => `KES ${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={v => fmt(v)} labelFormatter={l => `Month ${l}`} />
                      <Area type="monotone" dataKey="total_amount || total" stroke="#10b981" fill="url(#colorAmt)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-gray-400"><TrendingUp className="w-8 h-8" /></div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <h3 className="font-semibold mb-4">Department Spending</h3>
                {deptSpending.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={deptSpending} dataKey="amount || total" nameKey="department" cx="50%" cy="50%" outerRadius={100} label={({ department, percent }) => `${department} (${(percent * 100).toFixed(0)}%)`}>
                        {deptSpending.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={v => fmt(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-gray-400"><Users className="w-8 h-8" /></div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'stock' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KpiCard title="Total Stock Value" value={fmt(stockValue?.total_value || 0)} icon={DollarSign} color="bg-blue-500" />
            <KpiCard title="Low Stock Items" value={lowStock.length} icon={AlertTriangle} color="bg-red-500" />
            <KpiCard title="Stock Movements (In/Out)" value={`${stockValue?.total_in || 0} / ${stockValue?.total_out || 0}`} icon={Package} color="bg-indigo-500" />
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Low Stock Items</h3>
                <div className="flex gap-2">
                  <button onClick={handleDownloadPdf} disabled={downloading} className="btn-secondary btn-sm gap-1 disabled:opacity-50"><Download className="w-3 h-3" /> PDF</button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="data-table text-sm">
                  <thead><tr><th>Item</th><th>SKU</th><th>Current Stock</th><th>Min Stock</th><th>Status</th></tr></thead>
                  <tbody>
                    {lowStock.map(item => (
                      <tr key={item.id}>
                        <td className="font-medium">{item.item_name || item.name}</td>
                        <td className="font-mono">{item.sku || '-'}</td>
                        <td className="text-red-600 font-medium">{item.current_stock ?? item.quantity ?? 0}</td>
                        <td>{item.min_stock ?? item.minimum_quantity ?? 0}</td>
                        <td><span className="badge badge-red">Low Stock</span></td>
                      </tr>
                    ))}
                    {lowStock.length === 0 && <tr><td colSpan={5} className="text-center text-gray-400 py-6">No low stock items</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'supplier' && (
        <div className="space-y-6">
          <div className="card">
            <div className="card-body">
              <h3 className="font-semibold mb-4">Top Suppliers by Spend</h3>
              <div className="overflow-x-auto">
                <table className="data-table text-sm">
                  <thead><tr><th>#</th><th>Supplier</th><th>Total Spend</th><th>Order Count</th><th>Avg Rating</th></tr></thead>
                  <tbody>
                    {topSuppliers.map((s, i) => (
                      <tr key={s.id || i}>
                        <td className="text-gray-400">{i + 1}</td>
                        <td className="font-medium">{s.name}</td>
                        <td>{fmt(s.total_spend || s.total_amount || 0)}</td>
                        <td>{s.order_count ?? s.count ?? 0}</td>
                        <td>
                          <div className="flex items-center gap-1">
                            <span className="text-amber-500">{'★'.repeat(Math.round(s.avg_rating || 0))}</span>
                            <span className="text-gray-300">{'★'.repeat(5 - Math.round(s.avg_rating || 0))}</span>
                            <span className="ml-1 text-gray-500">({(s.avg_rating || 0).toFixed(1)})</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {topSuppliers.length === 0 && <tr><td colSpan={5} className="text-center text-gray-400 py-6">No supplier data</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h3 className="font-semibold mb-4">Expiring Contracts</h3>
              <div className="overflow-x-auto">
                <table className="data-table text-sm">
                  <thead><tr><th>Supplier</th><th>Contract #</th><th>Start Date</th><th>End Date</th><th>Days Left</th><th>Status</th></tr></thead>
                  <tbody>
                    {expiringContracts.map(c => {
                      const daysLeft = Math.ceil((new Date(c.end_date) - new Date()) / (1000 * 60 * 60 * 24));
                      return (
                        <tr key={c.id}>
                          <td className="font-medium">{c.supplier_name}</td>
                          <td className="font-mono text-sm">{c.contract_number || c.contract_no || '-'}</td>
                          <td>{formatDate(c.start_date)}</td>
                          <td>{formatDate(c.end_date)}</td>
                          <td className={daysLeft <= 30 ? 'text-red-600 font-medium' : 'text-amber-600'}>{daysLeft > 0 ? `${daysLeft} days` : 'Expired'}</td>
                          <td><span className={`badge ${daysLeft <= 30 ? 'badge-red' : 'badge-amber'}`}>{daysLeft <= 30 ? 'Expiring Soon' : 'Active'}</span></td>
                        </tr>
                      );
                    })}
                    {expiringContracts.length === 0 && <tr><td colSpan={6} className="text-center text-gray-400 py-6">No expiring contracts</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'spend' && (
        <div className="space-y-6">
          <div className="card">
            <div className="card-body">
              <h3 className="font-semibold mb-4">Department Spending Comparison</h3>
              {deptSpending.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={deptSpending}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="department" />
                    <YAxis tickFormatter={v => `KES ${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={v => fmt(v)} />
                    <Bar dataKey="amount || total" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                      {deptSpending.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[350px] text-gray-400"><BarChart className="w-8 h-8" /></div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <div className="card-body">
                <h3 className="font-semibold mb-4">Category Spending</h3>
                {deptSpending.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={deptSpending} dataKey="amount || total" nameKey="department" cx="50%" cy="50%" outerRadius={90} label={({ department, percent }) => `${department} (${(percent * 100).toFixed(0)}%)`}>
                        {deptSpending.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={v => fmt(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-gray-400"><Package className="w-8 h-8" /></div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <h3 className="font-semibold mb-4">Monthly Spend Trend</h3>
                {monthlyTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={monthlyTrend}>
                      <defs>
                        <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" tickFormatter={m => months[m - 1] || m} />
                      <YAxis tickFormatter={v => `KES ${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={v => fmt(v)} />
                      <Area type="monotone" dataKey="total_amount || total" stroke="#3b82f6" fill="url(#spendGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-gray-400"><TrendingUp className="w-8 h-8" /></div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
