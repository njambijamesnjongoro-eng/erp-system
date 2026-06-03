import { useState, useEffect, useCallback } from 'react';
import {
  GitBranch, Plus, Search, Loader2, X, AlertTriangle, User, Users,
} from 'lucide-react';
import { branchesService, companiesService } from '../../api/enterprise';
import { useTheme } from '../../hooks/useTheme';
import { formatDate } from '../../utils/helpers';

const BRANCH_TYPES = ['Head Office', 'Regional', 'Store', 'Warehouse', 'Factory'];

function EmptyState({ icon: Icon, message, sub }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <Icon className="w-14 h-14 mb-4 opacity-50" />
      <p className="text-lg font-medium text-gray-500 dark:text-gray-400">{message}</p>
      {sub && <p className="text-sm mt-1">{sub}</p>}
    </div>
  );
}

const initialForm = { code: '', name: '', type: 'Store', city: '', company_id: '' };

export function BranchesPage() {
  const { dark } = useTheme();
  const [branches, setBranches] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [assigning, setAssigning] = useState(null);
  const [assignManagerId, setAssignManagerId] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (search) params.search = search;
      if (companyFilter) params.company_id = companyFilter;
      const [res, compRes] = await Promise.all([
        branchesService.getAll(params),
        companiesService.getAll({ per_page: 200 }),
      ]);
      const asArray = (d) => (Array.isArray(d) ? d : []);
      setBranches(asArray(res.data?.data || res.data));
      setCompanies(asArray(compRes.data?.data || compRes.data));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, companyFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleOpenCreate = () => {
    setEditing(null);
    setForm(initialForm);
    setShowModal(true);
  };

  const handleOpenEdit = (b) => {
    setEditing(b);
    setForm({ code: b.branch_code || '', name: b.branch_name || '', type: b.branch_type || 'Store', city: b.city || '', company_id: b.company_id || '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        branch_name: form.name,
        branch_type: form.type,
        branch_code: form.code,
        city: form.city,
        company_id: form.company_id,
      };
      if (editing) {
        await branchesService.update(editing.id, payload);
      } else {
        await branchesService.create(payload);
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAssignManager = async (id) => {
    if (!assignManagerId) return;
    try {
      await branchesService.assignManager(id, { user_id: assignManagerId });
      setBranches((prev) => prev.map((b) => (b.id === id ? { ...b, manager_id: assignManagerId } : b)));
      setAssigning(null);
      setAssignManagerId('');
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  if (loading && branches.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Branches</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage company branches</p>
          </div>
        </div>
        <div className="card"><div className="card-body p-0">
          <div className="h-96 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        </div></div>
      </div>
    );
  }

  if (error && branches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-red-500">
        <AlertTriangle className="w-10 h-10 mb-3" />
        <p className="text-lg font-medium">Failed to load branches</p>
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
            <GitBranch className="w-6 h-6 text-primary-600" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Branches</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{branches.length} branches</p>
        </div>
        <button onClick={handleOpenCreate} className="btn-primary gap-2">
          <Plus className="w-4 h-4" /> Add Branch
        </button>
      </div>

      <div className="card">
        <div className="card-body p-0">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search branches..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input-field pl-10 w-full"
                />
              </div>
              <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)} className="input-field w-auto min-w-[150px]">
                <option value="">All Companies</option>
                  {companies.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
            </div>
          </div>
          {branches.length === 0 ? (
            <EmptyState icon={GitBranch} message="No branches found" sub={search || companyFilter ? 'Try adjusting your filters' : 'Add your first branch'} />
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Type</th>
                    <th>City</th>
                    <th>Company</th>
                    <th>Manager</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {branches.map((b) => (
                    <tr key={b.id}>
                      <td className="font-mono text-sm font-medium text-gray-900 dark:text-white">{b.branch_code || '-'}</td>
                      <td className="font-medium text-gray-900 dark:text-white">{b.branch_name}</td>
                      <td className="text-sm text-gray-600 dark:text-gray-400">{b.branch_type || '-'}</td>
                      <td className="text-sm text-gray-600 dark:text-gray-400">{b.city || '-'}</td>
                      <td className="text-sm text-gray-600 dark:text-gray-400">{b.company_name || '-'}</td>
                      <td className="text-sm text-gray-600 dark:text-gray-400">{b.manager_name || 'Unassigned'}</td>
                      <td>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${b.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                          {b.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="text-sm text-gray-500">{formatDate(b.created_at)}</td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleOpenEdit(b)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500" title="Edit">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          {assigning === b.id ? (
                            <div className="flex items-center gap-1">
                              <select value={assignManagerId} onChange={(e) => setAssignManagerId(e.target.value)} className="input-field text-xs w-28 py-1">
                                <option value="">Select...</option>
                                {companies.flatMap(c => c.employees || c.users || []).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                              </select>
                              <button onClick={() => handleAssignManager(b.id)} className="p-1 text-emerald-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                              </button>
                              <button onClick={() => { setAssigning(null); setAssignManagerId(''); }} className="p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><X className="w-4 h-4" /></button>
                            </div>
                          ) : (
                            <button onClick={() => setAssigning(b.id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500" title="Assign Manager">
                              <User className="w-4 h-4" />
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

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{editing ? 'Edit Branch' : 'Add Branch'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Code *</label>
                  <input type="text" placeholder="e.g. BR001" value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} className="input-field w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                  <input type="text" placeholder="Branch name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="input-field w-full" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company</label>
                  <select value={form.company_id} onChange={(e) => setForm((p) => ({ ...p, company_id: e.target.value }))} className="input-field w-full">
                    <option value="">Select company</option>
                    {companies.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                  <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))} className="input-field w-full">
                    {BRANCH_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City</label>
                <input type="text" placeholder="City" value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} className="input-field w-full" />
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
