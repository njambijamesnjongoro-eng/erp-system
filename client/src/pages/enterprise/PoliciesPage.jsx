import { useState, useEffect, useCallback } from 'react';
import {
  FileText, Plus, Search, Loader2, X, AlertTriangle, CheckCircle, BookOpen,
} from 'lucide-react';
import { policyService } from '../../api/enterprise';
import { useTheme } from '../../hooks/useTheme';
import { formatDate } from '../../utils/helpers';

const TABS = ['Policies', 'My Acknowledgements'];

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  published: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  archived: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

const CATEGORY_OPTIONS = ['HR', 'IT', 'Finance', 'Security', 'Compliance', 'Operations', 'General'];

function EmptyState({ icon: Icon, message, sub }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <Icon className="w-14 h-14 mb-4 opacity-50" />
      <p className="text-lg font-medium text-gray-500 dark:text-gray-400">{message}</p>
      {sub && <p className="text-sm mt-1">{sub}</p>}
    </div>
  );
}

const initialForm = { title: '', code: '', category: 'General', content: '', effective_date: '', expiry_date: '' };

export function PoliciesPage() {
  const { dark } = useTheme();
  const [activeTab, setActiveTab] = useState('Policies');
  const [policies, setPolicies] = useState([]);
  const [acknowledgements, setAcknowledgements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [ackFilter, setAckFilter] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      if (activeTab === 'Policies') {
        const params = {};
        if (search) params.search = search;
        const res = await policyService.getAll(params);
        setPolicies(res.data?.data || res.data || []);
      } else {
        const params = {};
        if (ackFilter) params.status = ackFilter;
        const res = await policyService.getMyAcknowledgements();
        setAcknowledgements(res.data?.data || res.data || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, activeTab, ackFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleOpenCreate = () => {
    setEditing(null);
    setForm(initialForm);
    setShowModal(true);
  };

  const handleOpenEdit = (p) => {
    setEditing(p);
    setForm({
      title: p.title || '',
      code: p.code || '',
      category: p.category || 'General',
      content: p.content || '',
      effective_date: p.effective_date ? p.effective_date.split('T')[0] : '',
      expiry_date: p.expiry_date ? p.expiry_date.split('T')[0] : '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await policyService.update(editing.id, form);
      } else {
        await policyService.create(form);
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (id) => {
    try {
      await policyService.publish(id);
      setPolicies((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'published' } : p)));
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this policy?')) return;
    try {
      await policyService.delete(id);
      setPolicies((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleAcknowledge = async (id) => {
    try {
      await policyService.acknowledge(id);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  if (loading && policies.length === 0 && acknowledgements.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Policies</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage enterprise policies</p>
          </div>
        </div>
        <div className="card"><div className="card-body p-0">
          <div className="h-96 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>
        </div></div>
      </div>
    );
  }

  if (error && policies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-red-500">
        <AlertTriangle className="w-10 h-10 mb-3" />
        <p className="text-lg font-medium">Failed to load policies</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{error}</p>
        <button onClick={loadData} className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary-600" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Policies</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{policies.length} policies</p>
        </div>
        {activeTab === 'Policies' && (
          <button onClick={handleOpenCreate} className="btn-primary gap-2"><Plus className="w-4 h-4" /> New Policy</button>
        )}
      </div>

      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === tab ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Policies' && (
        <div className="card">
          <div className="card-body p-0">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" placeholder="Search policies..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10 w-full" />
              </div>
            </div>
            {policies.length === 0 ? (
              <EmptyState icon={FileText} message="No policies" sub="Create your first policy" />
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Title</th>
                      <th>Category</th>
                      <th>Version</th>
                      <th>Status</th>
                      <th>Effective</th>
                      <th>Expiry</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {policies.map((p) => (
                      <tr key={p.id}>
                        <td className="font-mono text-sm font-medium text-gray-900 dark:text-white">{p.code || '-'}</td>
                        <td className="font-medium text-gray-900 dark:text-white max-w-[200px] truncate">{p.title}</td>
                        <td>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                            {p.category || 'General'}
                          </span>
                        </td>
                        <td className="text-sm text-gray-600 dark:text-gray-400">v{p.version || '1'}</td>
                        <td>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status] || STATUS_COLORS.draft}`}>
                            {p.status || 'draft'}
                          </span>
                        </td>
                        <td className="text-sm text-gray-500">{formatDate(p.effective_date)}</td>
                        <td className="text-sm text-gray-500">{formatDate(p.expiry_date)}</td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => handleOpenEdit(p)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500" title="Edit">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            {p.status === 'draft' && (
                              <button onClick={() => handlePublish(p.id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-emerald-500" title="Publish">
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                            <button onClick={() => handleDelete(p.id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-red-500" title="Delete">
                              <X className="w-4 h-4" />
                            </button>
                            {p.status === 'published' && (
                              <button onClick={() => handleAcknowledge(p.id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-primary-600" title="Acknowledge">
                                <BookOpen className="w-4 h-4" />
                              </button>
                            )}
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
      )}

      {activeTab === 'My Acknowledgements' && (
        <div className="card">
          <div className="card-body p-0">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800">
              <div className="flex flex-wrap items-center gap-3">
                <select value={ackFilter} onChange={(e) => setAckFilter(e.target.value)} className="input-field w-auto min-w-[150px]">
                  <option value="">All</option>
                  <option value="acknowledged">Acknowledged</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
            </div>
            {acknowledgements.length === 0 ? (
              <EmptyState icon={BookOpen} message="No acknowledgements" sub="Acknowledge policies to track compliance" />
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Policy</th>
                      <th>Employee</th>
                      <th>Status</th>
                      <th>Acknowledged At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {acknowledgements.map((a) => (
                      <tr key={a.id}>
                        <td className="font-medium text-gray-900 dark:text-white">{a.policy_title || a.policy?.title || '-'}</td>
                        <td className="text-sm text-gray-600 dark:text-gray-400">{a.employee_name || a.employee?.name || a.user_name || '-'}</td>
                        <td>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${a.acknowledged ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                            {a.acknowledged ? 'Acknowledged' : 'Pending'}
                          </span>
                        </td>
                        <td className="text-sm text-gray-500">{a.acknowledged ? formatDate(a.acknowledged_at) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{editing ? 'Edit Policy' : 'New Policy'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
                  <input type="text" placeholder="Policy title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} className="input-field w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Code</label>
                  <input type="text" placeholder="e.g. POL-001" value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} className="input-field w-full" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                <select value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} className="input-field w-full">
                  {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Content</label>
                <textarea placeholder="Policy content..." value={form.content} onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))} rows={5} className="input-field w-full resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Effective Date</label>
                  <input type="date" value={form.effective_date} onChange={(e) => setForm((p) => ({ ...p, effective_date: e.target.value }))} className="input-field w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expiry Date</label>
                  <input type="date" value={form.expiry_date} onChange={(e) => setForm((p) => ({ ...p, expiry_date: e.target.value }))} className="input-field w-full" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.title.trim()} className="btn-primary disabled:opacity-50">
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
