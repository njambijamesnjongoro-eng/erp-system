import { useState, useEffect, useCallback } from 'react';
import {
  Building2, Plus, Search, Loader2, X, AlertTriangle, CheckCircle, XCircle, Users, GitBranch,
} from 'lucide-react';
import { companiesService } from '../../api/enterprise';
import { useTheme } from '../../hooks/useTheme';
import { formatDate } from '../../utils/helpers';

const STATUS_OPTIONS = ['All', 'active', 'inactive'];

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

const initialForm = { code: '', name: '', legal_name: '', tax_id: '', city: '', country: '', subscription_tier: 'Free' };

export function CompaniesPage() {
  const { dark } = useTheme();
  const [companies, setCompanies] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(null);
  const [showConfirm, setShowConfirm] = useState(null);
  const [viewDetail, setViewDetail] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (statusFilter !== 'All') params.status = statusFilter;
      if (search) params.search = search;
      const [res, statsRes] = await Promise.all([
        companiesService.getAll(params),
        companiesService.getStats(),
      ]);
      setCompanies(res.data?.data || res.data || []);
      setStats(statsRes.data?.data || statsRes.data || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleOpenCreate = () => {
    setEditing(null);
    setForm(initialForm);
    setShowModal(true);
  };

  const handleOpenEdit = (c) => {
    setEditing(c);
    setForm({ code: c.code || '', name: c.name || '', legal_name: c.legal_name || '', tax_id: c.tax_id || '', city: c.city || '', country: c.country || '', subscription_tier: c.subscription_tier || 'Free' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await companiesService.update(editing.id, form);
      } else {
        await companiesService.create(form);
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id, currentStatus) => {
    try {
      setToggling(id);
      await companiesService.toggle(id, { status: currentStatus === 'active' ? 'inactive' : 'active' });
      setCompanies((prev) => prev.map((c) => (c.id === id ? { ...c, status: currentStatus === 'active' ? 'inactive' : 'active' } : c)));
      setShowConfirm(null);
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setToggling(null);
    }
  };

  const handleViewDetail = async (c) => {
    try {
      const res = await companiesService.getById(c.id);
      setViewDetail(res.data?.data || res.data || c);
    } catch (err) {
      setViewDetail(c);
    }
  };

  if (loading && companies.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Companies</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage enterprise companies</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
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

  if (error && companies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-red-500">
        <AlertTriangle className="w-10 h-10 mb-3" />
        <p className="text-lg font-medium">Failed to load companies</p>
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
            <Building2 className="w-6 h-6 text-primary-600" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Companies</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{stats?.total ?? companies.length} companies</p>
        </div>
        <button onClick={handleOpenCreate} className="btn-primary gap-2">
          <Plus className="w-4 h-4" /> Add Company
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Total Companies" value={stats?.total ?? companies.length} icon={Building2} color="bg-primary-600" />
        <StatCard label="Active" value={stats?.active ?? companies.filter(c => c.status === 'active').length} icon={CheckCircle} color="bg-emerald-500" />
        <StatCard label="Inactive" value={stats?.inactive ?? companies.filter(c => c.status === 'inactive').length} icon={XCircle} color="bg-gray-500" />
      </div>

      <div className="card">
        <div className="card-body p-0">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search companies..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input-field pl-10 w-full"
                />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field w-auto min-w-[120px]">
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          {companies.length === 0 ? (
            <EmptyState icon={Building2} message="No companies found" sub={search ? 'Try adjusting your search' : 'Add your first company'} />
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Legal Name</th>
                    <th>Tax ID</th>
                    <th>City</th>
                    <th>Country</th>
                    <th>Status</th>
                    <th>Subscription</th>
                    <th>Created</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((c) => (
                    <tr key={c.id}>
                      <td className="font-mono text-sm font-medium text-gray-900 dark:text-white">{c.code || '-'}</td>
                      <td className="font-medium text-gray-900 dark:text-white">
                        <button onClick={() => handleViewDetail(c)} className="hover:text-primary-600 text-left">{c.name}</button>
                      </td>
                      <td className="text-sm text-gray-600 dark:text-gray-400">{c.legal_name || '-'}</td>
                      <td className="text-sm text-gray-600 dark:text-gray-400">{c.tax_id || '-'}</td>
                      <td className="text-sm text-gray-600 dark:text-gray-400">{c.city || '-'}</td>
                      <td className="text-sm text-gray-600 dark:text-gray-400">{c.country || '-'}</td>
                      <td>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                          {c.status || 'inactive'}
                        </span>
                      </td>
                      <td className="text-sm text-gray-600 dark:text-gray-400">{c.subscription_tier || 'Free'}</td>
                      <td className="text-sm text-gray-500">{formatDate(c.created_at)}</td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleOpenEdit(c)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500" title="Edit">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button onClick={() => setShowConfirm(showConfirm === c.id ? null : c.id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500" title={c.status === 'active' ? 'Deactivate' : 'Activate'}>
                            {c.status === 'active' ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                          </button>
                          {showConfirm === c.id && (
                            <div className="flex items-center gap-1 ml-1">
                              <button onClick={() => handleToggle(c.id, c.status)} disabled={toggling === c.id} className="p-1 text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded">
                                {toggling === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : (c.status === 'active' ? 'Deactivate' : 'Activate')}
                              </button>
                              <button onClick={() => setShowConfirm(null)} className="p-1 text-xs bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 rounded">Cancel</button>
                            </div>
                          )}
                          <button onClick={() => handleViewDetail(c)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500" title="View Details">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {viewDetail && (
        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{viewDetail.name}</h3>
              <button onClick={() => setViewDetail(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">Code</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{viewDetail.code || '-'}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">Legal Name</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{viewDetail.legal_name || '-'}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">Tax ID</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{viewDetail.tax_id || '-'}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${viewDetail.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                  {viewDetail.status || 'inactive'}
                </span>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">City</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{viewDetail.city || '-'}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">Country</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{viewDetail.country || '-'}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">Subscription</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{viewDetail.subscription_tier || 'Free'}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">Created</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(viewDetail.created_at)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                <GitBranch className="w-5 h-5 text-primary-600" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Branches</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{viewDetail.branch_count ?? viewDetail.branches_count ?? 0}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                <Users className="w-5 h-5 text-primary-600" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Users</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{viewDetail.user_count ?? viewDetail.users_count ?? 0}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{editing ? 'Edit Company' : 'Add Company'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Code *</label>
                  <input type="text" placeholder="e.g. C001" value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} className="input-field w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                  <input type="text" placeholder="Company name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="input-field w-full" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Legal Name</label>
                <input type="text" placeholder="Legal entity name" value={form.legal_name} onChange={(e) => setForm((p) => ({ ...p, legal_name: e.target.value }))} className="input-field w-full" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tax ID</label>
                  <input type="text" placeholder="Tax identification" value={form.tax_id} onChange={(e) => setForm((p) => ({ ...p, tax_id: e.target.value }))} className="input-field w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subscription</label>
                  <select value={form.subscription_tier} onChange={(e) => setForm((p) => ({ ...p, subscription_tier: e.target.value }))} className="input-field w-full">
                    <option value="Free">Free</option>
                    <option value="Basic">Basic</option>
                    <option value="Professional">Professional</option>
                    <option value="Enterprise">Enterprise</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City</label>
                  <input type="text" placeholder="City" value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} className="input-field w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Country</label>
                  <input type="text" placeholder="Country" value={form.country} onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))} className="input-field w-full" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.name.trim()} className="btn-primary disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {saving ? ' Saving...' : (editing ? 'Update' : 'Create')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
