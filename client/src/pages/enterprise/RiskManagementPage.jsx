import { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle, Plus, Search, Loader2, X, CheckCircle, Shield,
} from 'lucide-react';
import { riskService } from '../../api/enterprise';
import { useTheme } from '../../hooks/useTheme';
import { formatDate } from '../../utils/helpers';

const PROBABILITY_OPTIONS = [
  { value: 1, label: 'Rare' },
  { value: 2, label: 'Unlikely' },
  { value: 3, label: 'Possible' },
  { value: 4, label: 'Likely' },
  { value: 5, label: 'Almost Certain' },
];

const IMPACT_OPTIONS = [
  { value: 1, label: 'Negligible' },
  { value: 2, label: 'Minor' },
  { value: 3, label: 'Moderate' },
  { value: 4, label: 'Major' },
  { value: 5, label: 'Severe' },
];

const STATUS_OPTIONS = ['open', 'mitigating', 'closed', 'accepted'];

const STATUS_COLORS = {
  open: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  mitigating: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  closed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  accepted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

function getRiskScoreColor(score) {
  if (score <= 4) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
  if (score <= 9) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
  if (score <= 16) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
  return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
}

function getRiskBg(score) {
  if (score <= 4) return 'bg-emerald-500';
  if (score <= 9) return 'bg-amber-500';
  if (score <= 16) return 'bg-orange-500';
  return 'bg-red-500';
}

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

const initialForm = { title: '', type: 'operational', description: '', probability: 2, impact: 2, owner: '', review_date: '' };

function calculateScore(prob, imp) {
  return (prob || 1) * (imp || 1);
}

export function RiskManagementPage() {
  const { dark } = useTheme();
  const [dashboard, setDashboard] = useState(null);
  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const [dashRes, riskRes] = await Promise.all([
        riskService.getDashboard(),
        riskService.getAll(params),
      ]);
      setDashboard(dashRes.data?.data || dashRes.data || null);
      setRisks(riskRes.data?.data || riskRes.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleOpenCreate = () => {
    setEditing(null);
    setForm(initialForm);
    setShowModal(true);
  };

  const handleOpenEdit = (r) => {
    setEditing(r);
    setForm({
      title: r.title || '',
      type: r.type || 'operational',
      description: r.description || '',
      probability: r.probability || 2,
      impact: r.impact || 2,
      owner: r.owner || '',
      review_date: r.review_date ? r.review_date.split('T')[0] : '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const data = { ...form, risk_score: calculateScore(form.probability, form.impact) };
      if (editing) {
        await riskService.update(editing.id, data);
      } else {
        await riskService.create(data);
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await riskService.update(id, { status });
      setRisks((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const matrixRows = [5, 4, 3, 2, 1];

  if (loading && risks.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Risk Management</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Assess and manage enterprise risks</p>
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
          <div className="h-96 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>
        </div></div>
      </div>
    );
  }

  if (error && risks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-red-500">
        <AlertTriangle className="w-10 h-10 mb-3" />
        <p className="text-lg font-medium">Failed to load risks</p>
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
            <AlertTriangle className="w-6 h-6 text-primary-600" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Risk Management</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{dashboard?.total ?? risks.length} assessments</p>
        </div>
        <button onClick={handleOpenCreate} className="btn-primary gap-2"><Plus className="w-4 h-4" /> Add Assessment</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Risks" value={dashboard?.total ?? risks.length} icon={AlertTriangle} color="bg-primary-600" />
        <StatCard label="Open" value={dashboard?.open ?? risks.filter(r => r.status === 'open').length} icon={Shield} color="bg-red-500" />
        <StatCard label="Mitigating" value={dashboard?.mitigating ?? risks.filter(r => r.status === 'mitigating').length} icon={CheckCircle} color="bg-amber-500" />
        <StatCard label="Avg Score" value={dashboard?.avg_score != null ? dashboard.avg_score : '-'} icon={AlertTriangle} color="bg-orange-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 card">
          <div className="card-body">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Risk Matrix</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs">
                <thead>
                  <tr>
                    <th className="p-1 text-gray-500 w-16"></th>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <th key={i} className="p-1 text-gray-500 font-medium">Impact {i}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrixRows.map((prob) => (
                    <tr key={prob}>
                      <td className="p-1 text-gray-500 font-medium whitespace-nowrap">Prob {prob}</td>
                      {[1, 2, 3, 4, 5].map((imp) => {
                        const score = prob * imp;
                        const color = getRiskBg(score);
                        const count = risks.filter(r => r.probability === prob && r.impact === imp).length;
                        return (
                          <td key={imp} className={`p-1 ${color} text-white text-xs font-medium rounded`}>
                            {count > 0 ? count : ''}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500" /> 1-4</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500" /> 5-9</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-500" /> 10-16</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500" /> 17-25</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 card">
          <div className="card-body p-0">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[180px] relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" placeholder="Search risks..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10 w-full" />
                </div>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field w-auto min-w-[120px]">
                  <option value="">All Status</option>
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            {risks.length === 0 ? (
              <EmptyState icon={AlertTriangle} message="No risk assessments" sub="Add your first assessment" />
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Type</th>
                      <th>Probability</th>
                      <th>Impact</th>
                      <th>Score</th>
                      <th>Status</th>
                      <th>Owner</th>
                      <th>Review Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {risks.map((r) => {
                      const score = r.risk_score ?? calculateScore(r.probability, r.impact);
                      return (
                        <tr key={r.id}>
                          <td className="font-medium text-gray-900 dark:text-white">
                            <button onClick={() => handleOpenEdit(r)} className="hover:text-primary-600 text-left">{r.title}</button>
                          </td>
                          <td className="text-sm text-gray-600 dark:text-gray-400">{r.type || '-'}</td>
                          <td>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRiskScoreColor(r.probability * 3)}`}>
                              {r.probability || '-'}
                            </span>
                          </td>
                          <td>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRiskScoreColor(r.impact * 3)}`}>
                              {r.impact || '-'}
                            </span>
                          </td>
                          <td>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRiskScoreColor(score)}`}>
                              {score}
                            </span>
                          </td>
                          <td>
                            <select
                              value={r.status || 'open'}
                              onChange={(e) => handleStatusChange(r.id, e.target.value)}
                              className="input-field text-xs py-0.5 w-auto min-w-[80px]"
                            >
                              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </td>
                          <td className="text-sm text-gray-600 dark:text-gray-400">{r.owner || '-'}</td>
                          <td className="text-sm text-gray-500">{formatDate(r.review_date)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{editing ? 'Edit Assessment' : 'Add Risk Assessment'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
                <input type="text" placeholder="Risk title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} className="input-field w-full" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                  <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))} className="input-field w-full">
                    <option value="operational">Operational</option>
                    <option value="financial">Financial</option>
                    <option value="strategic">Strategic</option>
                    <option value="compliance">Compliance</option>
                    <option value="reputational">Reputational</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Owner</label>
                  <input type="text" placeholder="Risk owner" value={form.owner} onChange={(e) => setForm((p) => ({ ...p, owner: e.target.value }))} className="input-field w-full" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Probability</label>
                  <select value={form.probability} onChange={(e) => setForm((p) => ({ ...p, probability: Number(e.target.value) }))} className="input-field w-full">
                    {PROBABILITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label} ({o.value})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Impact</label>
                  <select value={form.impact} onChange={(e) => setForm((p) => ({ ...p, impact: Number(e.target.value) }))} className="input-field w-full">
                    {IMPACT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label} ({o.value})</option>)}
                  </select>
                </div>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Risk Score: <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRiskScoreColor(calculateScore(form.probability, form.impact))}`}>
                    {calculateScore(form.probability, form.impact)}
                  </span>
                  {' '}(Probability × Impact)
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea placeholder="Risk description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={3} className="input-field w-full resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Review Date</label>
                <input type="date" value={form.review_date} onChange={(e) => setForm((p) => ({ ...p, review_date: e.target.value }))} className="input-field w-full" />
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
