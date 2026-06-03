import { useState, useEffect, useCallback } from 'react';
import {
  Shield, Plus, Search, Loader2, X, AlertTriangle, CheckCircle, Clock, FileText, ChevronDown, ChevronRight,
} from 'lucide-react';
import { complianceService } from '../../api/enterprise';
import { useTheme } from '../../hooks/useTheme';
import { formatDate } from '../../utils/helpers';

const STATUS_COLORS = {
  compliant: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'non-compliant': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'partially-compliant': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'not-assessed': 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  passed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'in-progress': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

const RISK_COLORS = {
  low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
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

const initialFrameworkForm = { name: '', description: '', version: '1.0' };
const initialRequirementForm = { framework_id: '', title: '', description: '', control_id: '', risk_level: 'medium' };

export function ComplianceDashboard() {
  const { dark } = useTheme();
  const [dashboard, setDashboard] = useState(null);
  const [frameworks, setFrameworks] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedFramework, setExpandedFramework] = useState(null);
  const [showFrameworkModal, setShowFrameworkModal] = useState(false);
  const [frameworkForm, setFrameworkForm] = useState(initialFrameworkForm);
  const [showReqModal, setShowReqModal] = useState(false);
  const [reqForm, setReqForm] = useState(initialRequirementForm);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [dashRes, fwRes, reqRes, auditRes] = await Promise.all([
        complianceService.getDashboard(),
        complianceService.getFrameworks(),
        complianceService.getRequirements(),
        complianceService.getAudits(),
      ]);
      setDashboard(dashRes.data?.data || dashRes.data || null);
      setFrameworks(fwRes.data?.data || fwRes.data || []);
      setRequirements(reqRes.data?.data || reqRes.data || []);
      setAudits(auditRes.data?.data || auditRes.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreateFramework = async () => {
    if (!frameworkForm.name.trim()) return;
    setSaving(true);
    try {
      await complianceService.createFramework(frameworkForm);
      setShowFrameworkModal(false);
      setFrameworkForm(initialFrameworkForm);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRequirement = async () => {
    if (!reqForm.title.trim() || !reqForm.framework_id) return;
    setSaving(true);
    try {
      await complianceService.createRequirement(reqForm);
      setShowReqModal(false);
      setReqForm(initialRequirementForm);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Compliance Dashboard</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Frameworks, requirements and audit history</p>
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

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-red-500">
        <AlertTriangle className="w-10 h-10 mb-3" />
        <p className="text-lg font-medium">Failed to load compliance data</p>
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
            <Shield className="w-6 h-6 text-primary-600" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Compliance Dashboard</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{frameworks.length} frameworks, {requirements.length} requirements</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowReqModal(true)} className="btn-secondary gap-2"><Plus className="w-4 h-4" /> Requirement</button>
          <button onClick={() => setShowFrameworkModal(true)} className="btn-primary gap-2"><Plus className="w-4 h-4" /> Framework</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Frameworks" value={dashboard?.total_frameworks ?? frameworks.length} icon={Shield} color="bg-primary-600" />
        <StatCard label="Compliant Reqs" value={dashboard?.compliant_count ?? requirements.filter(r => r.status === 'compliant').length} icon={CheckCircle} color="bg-emerald-500" />
        <StatCard label="Avg Score" value={dashboard?.avg_score != null ? `${dashboard.avg_score}%` : '-'} icon={FileText} color="bg-blue-500" />
        <StatCard label="Overdue Audits" value={dashboard?.overdue_count ?? audits.filter(a => a.status === 'overdue').length} icon={Clock} color="bg-red-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-body">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Frameworks</h3>
            {frameworks.length === 0 ? (
              <EmptyState icon={Shield} message="No frameworks" sub="Create your first compliance framework" />
            ) : (
              <div className="space-y-3">
                {frameworks.map((fw) => (
                  <div key={fw.id} className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedFramework(expandedFramework === fw.id ? null : fw.id)}
                      className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 text-left"
                    >
                      <div className="flex items-center gap-2">
                        {expandedFramework === fw.id ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                        <span className="font-medium text-gray-900 dark:text-white">{fw.name}</span>
                        <span className="text-xs text-gray-500">v{fw.version || '1.0'}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${fw.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                          {fw.status || 'active'}
                        </span>
                      </div>
                    </button>
                    {expandedFramework === fw.id && (
                      <div className="px-3 pb-3 space-y-2">
                        <p className="text-sm text-gray-600 dark:text-gray-400">{fw.description || 'No description'}</p>
                        {fw.score != null && (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${getScoreColor(fw.score)}`} style={{ width: `${fw.score}%` }} />
                            </div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{fw.score}%</span>
                          </div>
                        )}
                        <div className="text-xs text-gray-500">Requirements: {fw.requirement_count ?? fw.requirements_count ?? requirements.filter(r => r.framework_id === fw.id).length}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Requirements</h3>
            {requirements.length === 0 ? (
              <EmptyState icon={FileText} message="No requirements" sub="Create compliance requirements" />
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Control</th>
                      <th>Title</th>
                      <th>Status</th>
                      <th>Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requirements.map((r) => (
                      <tr key={r.id}>
                        <td className="font-mono text-xs text-gray-600 dark:text-gray-400">{r.control_id || '-'}</td>
                        <td className="text-sm font-medium text-gray-900 dark:text-white max-w-[200px] truncate">{r.title}</td>
                        <td>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status] || STATUS_COLORS['not-assessed']}`}>
                            {r.status || 'not-assessed'}
                          </span>
                        </td>
                        <td>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${RISK_COLORS[r.risk_level] || RISK_COLORS.medium}`}>
                            {r.risk_level || 'medium'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Audit History</h3>
          {audits.length === 0 ? (
            <EmptyState icon={Clock} message="No audits recorded" sub="Audit activity will appear here" />
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Framework</th>
                    <th>Auditor</th>
                    <th>Status</th>
                    <th>Score</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {audits.map((a) => (
                    <tr key={a.id}>
                      <td className="text-sm font-medium text-gray-900 dark:text-white">{a.framework_name || a.framework?.name || '-'}</td>
                      <td className="text-sm text-gray-600 dark:text-gray-400">{a.auditor || a.auditor_name || '-'}</td>
                      <td>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[a.status] || ''}`}>
                          {a.status || '-'}
                        </span>
                      </td>
                      <td className="text-sm text-gray-900 dark:text-white">{a.score != null ? `${a.score}%` : '-'}</td>
                      <td className="text-sm text-gray-500">{formatDate(a.audit_date || a.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showFrameworkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowFrameworkModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Create Framework</h3>
              <button onClick={() => setShowFrameworkModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                <input type="text" placeholder="Framework name" value={frameworkForm.name} onChange={(e) => setFrameworkForm((p) => ({ ...p, name: e.target.value }))} className="input-field w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea placeholder="Framework description" value={frameworkForm.description} onChange={(e) => setFrameworkForm((p) => ({ ...p, description: e.target.value }))} rows={3} className="input-field w-full resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Version</label>
                <input type="text" placeholder="1.0" value={frameworkForm.version} onChange={(e) => setFrameworkForm((p) => ({ ...p, version: e.target.value }))} className="input-field w-full" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowFrameworkModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleCreateFramework} disabled={saving || !frameworkForm.name.trim()} className="btn-primary disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {saving ? ' Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showReqModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowReqModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Create Requirement</h3>
              <button onClick={() => setShowReqModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Framework *</label>
                <select value={reqForm.framework_id} onChange={(e) => setReqForm((p) => ({ ...p, framework_id: e.target.value }))} className="input-field w-full">
                  <option value="">Select framework</option>
                  {frameworks.map((fw) => <option key={fw.id} value={fw.id}>{fw.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
                <input type="text" placeholder="Requirement title" value={reqForm.title} onChange={(e) => setReqForm((p) => ({ ...p, title: e.target.value }))} className="input-field w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Control ID</label>
                <input type="text" placeholder="e.g. CTRL-001" value={reqForm.control_id} onChange={(e) => setReqForm((p) => ({ ...p, control_id: e.target.value }))} className="input-field w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea placeholder="Requirement description" value={reqForm.description} onChange={(e) => setReqForm((p) => ({ ...p, description: e.target.value }))} rows={3} className="input-field w-full resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Risk Level</label>
                <select value={reqForm.risk_level} onChange={(e) => setReqForm((p) => ({ ...p, risk_level: e.target.value }))} className="input-field w-full">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowReqModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleCreateRequirement} disabled={saving || !reqForm.title.trim() || !reqForm.framework_id} className="btn-primary disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {saving ? ' Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
