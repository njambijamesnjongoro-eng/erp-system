import { useState, useEffect, useCallback } from 'react';
import {
  DollarSign, CreditCard, Smartphone, Banknote, ArrowUpDown, Plus, Search, Filter,
  CheckCircle, XCircle, Clock, RefreshCw, Loader2, X, ChevronDown, ChevronUp,
  AlertTriangle, Eye, History, User, Phone
} from 'lucide-react';
import { paymentService } from '../../api/portal';
import { useTheme } from '../../hooks/useTheme';
import { formatDate, formatDateTime } from '../../utils/helpers';

const STATUS_OPTIONS = ['All', 'Completed', 'Pending', 'Failed', 'Refunded'];
const TYPE_OPTIONS = ['All', 'Invoice', 'Payroll', 'Procurement', 'Service'];
const PROVIDER_OPTIONS_PARENT = ['All', 'M-Pesa', 'Bank Transfer', 'Card', 'Cash'];

const STATUS_COLORS = {
  Completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  Refunded: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

const PROVIDER_ICONS = {
  'M-Pesa': Smartphone,
  'Bank Transfer': Banknote,
  Card: CreditCard,
  Cash: DollarSign,
};

function EmptyState({ icon: Icon, message, sub }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <Icon className="w-14 h-14 mb-4 opacity-50" />
      <p className="text-lg font-medium text-gray-500 dark:text-gray-400">{message}</p>
      {sub && <p className="text-sm mt-1">{sub}</p>}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="card">
      <div className="card-body flex items-center gap-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value ?? '-'}</p>
        </div>
      </div>
    </div>
  );
}

export function PaymentsPage() {
  const { dark } = useTheme();

  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [providerFilter, setProviderFilter] = useState('All');

  const [selectedPayment, setSelectedPayment] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    payment_type: 'Invoice', amount: '', payer_name: '', payer_phone: '',
    description: '', provider: 'M-Pesa',
  });
  const [creating, setCreating] = useState(false);

  const [showMpesaModal, setShowMpesaModal] = useState(false);
  const [mpesaForm, setMpesaForm] = useState({ phone: '', amount: '', description: '' });
  const [mpesaProcessing, setMpesaProcessing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (statusFilter !== 'All') params.status = statusFilter;
      if (typeFilter !== 'All') params.payment_type = typeFilter;
      if (providerFilter !== 'All') params.provider = providerFilter;
      if (search) params.search = search;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const [paymentsRes, statsRes] = await Promise.all([
        paymentService.getAll(params),
        paymentService.getStats(),
      ]);
      setPayments(paymentsRes.data?.data || paymentsRes.data || []);
      setStats(statsRes.data?.data || statsRes.data || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, providerFilter, search, dateFrom, dateTo]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleExpand = (payment) => {
    if (expandedId === payment.id) {
      setExpandedId(null);
      setSelectedPayment(null);
      return;
    }
    setExpandedId(payment.id);
    setSelectedPayment(payment);
  };

  const handleCreatePayment = async () => {
    if (!createForm.amount || !createForm.payer_name) return;
    setCreating(true);
    try {
      await paymentService.create(createForm);
      setShowCreateModal(false);
      setCreateForm({
        payment_type: 'Invoice', amount: '', payer_name: '', payer_phone: '',
        description: '', provider: 'M-Pesa',
      });
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleMpesaPayment = async () => {
    if (!mpesaForm.phone || !mpesaForm.amount) return;
    setMpesaProcessing(true);
    try {
      await paymentService.processMpesa(mpesaForm);
      setShowMpesaModal(false);
      setMpesaForm({ phone: '', amount: '', description: '' });
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setMpesaProcessing(false);
    }
  };

  const getTotalAmount = () => {
    if (!stats) return payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    return stats.total_amount || stats.totalAmount || 0;
  };

  const formatCurrency = (amount, currency = 'KES') => {
    const num = parseFloat(amount) || 0;
    return `${currency} ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (loading && payments.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payments</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage and process payments</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card"><div className="card-body space-y-3">
              <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div></div>
          ))}
        </div>
        <div className="card"><div className="card-body p-0">
          <div className="h-96 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        </div></div>
      </div>
    );
  }

  if (error && payments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-red-500">
        <AlertTriangle className="w-10 h-10 mb-3" />
        <p className="text-lg font-medium">Failed to load payments</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{error}</p>
        <button onClick={loadData} className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-primary-600" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payments</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{stats?.total ?? payments.length} total payments</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowMpesaModal(true)} className="btn-secondary gap-2">
            <Smartphone className="w-4 h-4" /> M-Pesa
          </button>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary gap-2">
            <Plus className="w-4 h-4" /> Process Payment
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Payments" value={formatCurrency(getTotalAmount())} icon={DollarSign} color="bg-primary-600" />
        <StatCard label="Completed" value={stats?.completed ?? stats?.completed_count ?? 0} icon={CheckCircle} color="bg-emerald-500" />
        <StatCard label="Pending" value={stats?.pending ?? stats?.pending_count ?? 0} icon={Clock} color="bg-amber-500" />
        <StatCard label="Failed" value={stats?.failed ?? stats?.failed_count ?? 0} icon={XCircle} color="bg-red-500" />
      </div>

      <div className="card">
        <div className="card-body p-0">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search payments..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input-field pl-10 w-full"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400 hidden sm:block" />
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field w-auto min-w-[120px]">
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input-field w-auto min-w-[130px]">
                  {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <select value={providerFilter} onChange={(e) => setProviderFilter(e.target.value)} className="input-field w-auto min-w-[130px]">
                  {PROVIDER_OPTIONS_PARENT.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="input-field w-auto text-sm"
                  title="From date"
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="input-field w-auto text-sm"
                  title="To date"
                />
                <button onClick={loadData} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg" title="Refresh">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {payments.length === 0 ? (
            <EmptyState icon={DollarSign} message="No payments found" sub={search ? 'Try adjusting your search or filters' : 'Process your first payment'} />
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="w-8"></th>
                    <th>Transaction ID</th>
                    <th>Payment Type</th>
                    <th>Amount</th>
                    <th>Currency</th>
                    <th>Provider</th>
                    <th>Payer</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => {
                    const ProviderIcon = PROVIDER_ICONS[p.provider] || DollarSign;
                    return (
                      <tr key={p.id}>
                        <td>
                          <button onClick={() => handleExpand(p)} className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                            {expandedId === p.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                          </button>
                        </td>
                        <td className="font-mono text-sm font-medium text-gray-900 dark:text-white">{p.transaction_id || `#${p.id}`}</td>
                        <td><span className="text-xs text-gray-600 dark:text-gray-400">{p.payment_type}</span></td>
                        <td className="font-medium text-gray-900 dark:text-white">{formatCurrency(p.amount, p.currency)}</td>
                        <td className="text-sm text-gray-600 dark:text-gray-400">{p.currency || 'KES'}</td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <ProviderIcon className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">{p.provider}</span>
                          </div>
                        </td>
                        <td className="text-sm text-gray-600 dark:text-gray-400">{p.payer_name || p.payer || '-'}</td>
                        <td>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status] || STATUS_COLORS.Pending}`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="text-sm text-gray-500">{formatDate(p.created_at || p.payment_date)}</td>
                        <td className="text-right">
                          <button onClick={() => handleExpand(p)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500" title="View Details">
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selectedPayment && expandedId && (
        <div className="card">
          <div className="card-body p-0">
            <div className="p-5 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Transaction {selectedPayment.transaction_id || `#${selectedPayment.id}`}
                </h3>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[selectedPayment.status] || STATUS_COLORS.Pending}`}>
                  {selectedPayment.status}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Amount</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(selectedPayment.amount, selectedPayment.currency)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Payment Type</span>
                    <span className="text-gray-900 dark:text-white">{selectedPayment.payment_type}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Provider</span>
                    <span className="text-gray-900 dark:text-white">{selectedPayment.provider}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Payer</span>
                    <span className="text-gray-900 dark:text-white">{selectedPayment.payer_name || selectedPayment.payer || '-'}</span>
                  </div>
                  {selectedPayment.payer_phone && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Payer Phone</span>
                      <span className="text-gray-900 dark:text-white">{selectedPayment.payer_phone}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  {selectedPayment.description && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Description</span>
                      <span className="text-gray-900 dark:text-white text-right max-w-[200px]">{selectedPayment.description}</span>
                    </div>
                  )}
                  {selectedPayment.reference_type && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Reference Type</span>
                      <span className="text-gray-900 dark:text-white">{selectedPayment.reference_type}</span>
                    </div>
                  )}
                  {selectedPayment.reference_id && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Reference ID</span>
                      <span className="text-gray-900 dark:text-white">#{selectedPayment.reference_id}</span>
                    </div>
                  )}
                  {selectedPayment.mpesa_receipt && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">M-Pesa Receipt</span>
                      <span className="text-gray-900 dark:text-white font-mono">{selectedPayment.mpesa_receipt}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Created</span>
                    <span className="text-gray-900 dark:text-white">{formatDateTime(selectedPayment.created_at)}</span>
                  </div>
                  {selectedPayment.processed_at && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Processed</span>
                      <span className="text-gray-900 dark:text-white">{formatDateTime(selectedPayment.processed_at)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {selectedPayment.status_history && selectedPayment.status_history.length > 0 && (
              <div className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <History className="w-4 h-4 text-gray-500" />
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Status History</h4>
                </div>
                <div className="space-y-2">
                  {selectedPayment.status_history.map((entry, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-2 flex-shrink-0" />
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[entry.status] || ''}`}>
                            {entry.status}
                          </span>
                          {entry.note && <span className="ml-2">{entry.note}</span>}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {formatDateTime(entry.changed_at || entry.created_at)}
                          {entry.changed_by && <> &middot; by {entry.changed_by}</>}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Process Payment</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Type</label>
                <select
                  value={createForm.payment_type}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, payment_type: e.target.value }))}
                  className="input-field w-full"
                >
                  {TYPE_OPTIONS.filter((t) => t !== 'All').map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount *</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={createForm.amount}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, amount: e.target.value }))}
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payer Name *</label>
                <input
                  type="text"
                  placeholder="Full name"
                  value={createForm.payer_name}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, payer_name: e.target.value }))}
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payer Phone</label>
                <input
                  type="text"
                  placeholder="+254 7XX XXX XXX"
                  value={createForm.payer_phone}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, payer_phone: e.target.value }))}
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  placeholder="Payment description..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="input-field w-full resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Provider</label>
                <select
                  value={createForm.provider}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, provider: e.target.value }))}
                  className="input-field w-full"
                >
                  {PROVIDER_OPTIONS_PARENT.filter((p) => p !== 'All').map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowCreateModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleCreatePayment} disabled={creating || !createForm.amount || !createForm.payer_name} className="btn-primary disabled:opacity-50">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {creating ? ' Processing...' : 'Process Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showMpesaModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowMpesaModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-primary-600" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">M-Pesa Payment</h3>
              </div>
              <button onClick={() => setShowMpesaModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number *</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="e.g. 254712345678"
                    value={mpesaForm.phone}
                    onChange={(e) => setMpesaForm((prev) => ({ ...prev, phone: e.target.value }))}
                    className="input-field pl-10 w-full"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Enter phone number in international format (254XXXXXXXXX)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount *</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={mpesaForm.amount}
                  onChange={(e) => setMpesaForm((prev) => ({ ...prev, amount: e.target.value }))}
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Optional description"
                  value={mpesaForm.description}
                  onChange={(e) => setMpesaForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="input-field w-full"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowMpesaModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleMpesaPayment} disabled={mpesaProcessing || !mpesaForm.phone || !mpesaForm.amount} className="btn-primary disabled:opacity-50 gap-2">
                {mpesaProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
                {mpesaProcessing ? ' Processing...' : 'Pay with M-Pesa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
