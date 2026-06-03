import { useState, useEffect, useCallback } from 'react';
import {
  Settings, Plus, Search, Loader2, X, AlertTriangle, CheckCircle, Copy, Key, Database, Bell, RefreshCw,
} from 'lucide-react';
import { enterpriseSettingsService } from '../../api/enterprise';
import { useTheme } from '../../hooks/useTheme';
import { formatDate } from '../../utils/helpers';

const TABS = ['API Keys', 'Governance', 'Orchestration', 'Search'];

const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  critical: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
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

const initialApiKeyForm = { name: '', expires_in_days: 90 };
const initialGovernanceForm = { entity_type: '', retention_days: 365, archive_after_days: 730, purge_after_days: 1095, legal_hold: false };
const initialOrchestrationForm = { name: '', trigger_event: '', channels: '', escalation_minutes: 30, priority: 'medium' };

export function EnterpriseSettingsPage() {
  const { dark } = useTheme();
  const [activeTab, setActiveTab] = useState('API Keys');
  const [apiKeys, setApiKeys] = useState([]);
  const [governanceRules, setGovernanceRules] = useState([]);
  const [orchestrationRules, setOrchestrationRules] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyForm, setApiKeyForm] = useState(initialApiKeyForm);
  const [newApiKey, setNewApiKey] = useState(null);

  const [showGovernanceModal, setShowGovernanceModal] = useState(false);
  const [govForm, setGovForm] = useState(initialGovernanceForm);
  const [editingGov, setEditingGov] = useState(null);

  const [showOrchModal, setShowOrchModal] = useState(false);
  const [orchForm, setOrchForm] = useState(initialOrchestrationForm);
  const [editingOrch, setEditingOrch] = useState(null);

  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const promises = [];
      if (activeTab === 'API Keys') promises.push(enterpriseSettingsService.getApiKeys());
      if (activeTab === 'Governance') promises.push(enterpriseSettingsService.getGovernanceRules());
      if (activeTab === 'Orchestration') promises.push(enterpriseSettingsService.getOrchestrationRules());
      const results = await Promise.all(promises);
      if (results[0]) setApiKeys(results[0].data?.data || results[0].data || []);
      if (results[1]) setGovernanceRules(results[1].data?.data || results[1].data || []);
      if (results[2]) setOrchestrationRules(results[2].data?.data || results[2].data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreateApiKey = async () => {
    if (!apiKeyForm.name.trim()) return;
    setSaving(true);
    try {
      const res = await enterpriseSettingsService.createApiKey(apiKeyForm);
      const key = res.data?.data || res.data;
      setNewApiKey(key);
      setApiKeyForm(initialApiKeyForm);
      setShowApiKeyModal(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRevokeApiKey = async (id) => {
    if (!window.confirm('Revoke this API key? This cannot be undone.')) return;
    try {
      await enterpriseSettingsService.revokeApiKey(id);
      setApiKeys((prev) => prev.map((k) => (k.id === id ? { ...k, status: 'revoked' } : k)));
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleSaveGovernance = async () => {
    if (!govForm.entity_type.trim()) return;
    setSaving(true);
    try {
      if (editingGov) {
        await enterpriseSettingsService.updateGovernanceRule(editingGov.id, govForm);
      } else {
        await enterpriseSettingsService.createGovernanceRule(govForm);
      }
      setShowGovernanceModal(false);
      setEditingGov(null);
      setGovForm(initialGovernanceForm);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveOrchestration = async () => {
    if (!orchForm.name.trim()) return;
    setSaving(true);
    try {
      if (editingOrch) {
        await enterpriseSettingsService.updateOrchestrationRule(editingOrch.id, orchForm);
      } else {
        await enterpriseSettingsService.createOrchestrationRule(orchForm);
      }
      setShowOrchModal(false);
      setEditingOrch(null);
      setOrchForm(initialOrchestrationForm);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const res = await enterpriseSettingsService.search({ query: searchQuery });
      setSearchResults(res.data?.data || res.data || []);
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleReindex = async (entityType) => {
    try {
      await enterpriseSettingsService.reindex({ entity_type: entityType });
      alert(`Reindexing ${entityType} started`);
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard?.writeText(text).catch(() => {});
  };

  if (loading && apiKeys.length === 0 && governanceRules.length === 0 && orchestrationRules.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Enterprise Settings</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">API keys, governance, and orchestration</p>
          </div>
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
        <p className="text-lg font-medium">Failed to load settings</p>
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
            <Settings className="w-6 h-6 text-primary-600" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Enterprise Settings</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Configuration for enterprise features</p>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === tab ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'API Keys' && (
        <div className="card">
          <div className="card-body p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900 dark:text-white">API Keys</h3>
            <button onClick={() => { setApiKeyForm(initialApiKeyForm); setShowApiKeyModal(true); }} className="btn-primary gap-2 text-sm py-1.5"><Plus className="w-3 h-3" /> Create Key</button>
          </div>
          {apiKeys.length === 0 ? (
            <EmptyState icon={Key} message="No API keys" sub="Create your first API key" />
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Key</th>
                    <th>Status</th>
                    <th>Last Used</th>
                    <th>Expires</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {apiKeys.map((k) => (
                    <tr key={k.id}>
                      <td className="font-medium text-gray-900 dark:text-white">{k.name}</td>
                      <td className="font-mono text-sm text-gray-500">{k.masked_key || `${k.key?.slice(0, 8)}...` || '-'}</td>
                      <td>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${k.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                          {k.status || 'active'}
                        </span>
                      </td>
                      <td className="text-sm text-gray-500">{k.last_used_at ? formatDate(k.last_used_at) : 'Never'}</td>
                      <td className="text-sm text-gray-500">{formatDate(k.expires_at)}</td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => copyToClipboard(k.key || '')} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500" title="Copy">
                            <Copy className="w-4 h-4" />
                          </button>
                          {k.status === 'active' && (
                            <button onClick={() => handleRevokeApiKey(k.id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-red-500" title="Revoke">
                              <X className="w-4 h-4" />
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
      )}

      {activeTab === 'Governance' && (
        <div className="card">
          <div className="card-body p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900 dark:text-white">Data Governance Rules</h3>
            <button onClick={() => { setEditingGov(null); setGovForm(initialGovernanceForm); setShowGovernanceModal(true); }} className="btn-primary gap-2 text-sm py-1.5"><Plus className="w-3 h-3" /> Add Rule</button>
          </div>
          {governanceRules.length === 0 ? (
            <EmptyState icon={Database} message="No governance rules" sub="Add data retention rules" />
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Entity Type</th>
                    <th>Retention (Days)</th>
                    <th>Archive After</th>
                    <th>Purge After</th>
                    <th>Legal Hold</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {governanceRules.map((r) => (
                    <tr key={r.id}>
                      <td className="font-medium text-gray-900 dark:text-white">{r.entity_type}</td>
                      <td className="text-sm text-gray-600 dark:text-gray-400">{r.retention_days ?? '-'}</td>
                      <td className="text-sm text-gray-600 dark:text-gray-400">{r.archive_after_days ? `${r.archive_after_days}d` : '-'}</td>
                      <td className="text-sm text-gray-600 dark:text-gray-400">{r.purge_after_days ? `${r.purge_after_days}d` : '-'}</td>
                      <td>
                        {r.legal_hold ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">Active</span>
                        ) : (
                          <span className="text-xs text-gray-400">No</span>
                        )}
                      </td>
                      <td className="text-right">
                        <button onClick={() => { setEditingGov(r); setGovForm({ entity_type: r.entity_type, retention_days: r.retention_days, archive_after_days: r.archive_after_days, purge_after_days: r.purge_after_days, legal_hold: r.legal_hold }); setShowGovernanceModal(true); }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500" title="Edit">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'Orchestration' && (
        <div className="card">
          <div className="card-body p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900 dark:text-white">Orchestration Rules</h3>
            <button onClick={() => { setEditingOrch(null); setOrchForm(initialOrchestrationForm); setShowOrchModal(true); }} className="btn-primary gap-2 text-sm py-1.5"><Plus className="w-3 h-3" /> Add Rule</button>
          </div>
          {orchestrationRules.length === 0 ? (
            <EmptyState icon={Bell} message="No orchestration rules" sub="Add notification and escalation rules" />
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Trigger Event</th>
                    <th>Priority</th>
                    <th>Channels</th>
                    <th>Escalation</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orchestrationRules.map((r) => (
                    <tr key={r.id}>
                      <td className="font-medium text-gray-900 dark:text-white">{r.name}</td>
                      <td className="text-sm text-gray-600 dark:text-gray-400">{r.trigger_event || '-'}</td>
                      <td>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[r.priority] || PRIORITY_COLORS.medium}`}>
                          {r.priority || 'medium'}
                        </span>
                      </td>
                      <td className="text-sm text-gray-600 dark:text-gray-400">{r.channels || '-'}</td>
                      <td className="text-sm text-gray-600 dark:text-gray-400">{r.escalation_minutes ? `${r.escalation_minutes}m` : '-'}</td>
                      <td className="text-right">
                        <button onClick={() => { setEditingOrch(r); setOrchForm({ name: r.name, trigger_event: r.trigger_event, channels: r.channels, escalation_minutes: r.escalation_minutes, priority: r.priority }); setShowOrchModal(true); }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500" title="Edit">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'Search' && (
        <div className="space-y-6">
          <div className="card">
            <div className="card-body">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Search Index</h3>
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" placeholder="Search across all enterprise data..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }} className="input-field pl-10 w-full" />
                </div>
                <button onClick={handleSearch} className="btn-primary">Search</button>
              </div>
            </div>
          </div>

          {searchResults.length > 0 && (
            <div className="card">
              <div className="card-body">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Results ({searchResults.length})</h4>
                <div className="space-y-2">
                  {searchResults.map((r, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{r.title || r.name || '-'}</p>
                        <p className="text-xs text-gray-500">{r.entity_type || r.type} - {r.description || ''}</p>
                      </div>
                      <span className="text-xs text-gray-400">{r.score ? `${Math.round(r.score * 100)}%` : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-body">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Reindex Entities</h4>
              <div className="flex flex-wrap gap-2">
                {['companies', 'branches', 'policies', 'workflows', 'risks'].map((entity) => (
                  <button key={entity} onClick={() => handleReindex(entity)} className="btn-secondary gap-2 text-sm">
                    <RefreshCw className="w-3 h-3" /> {entity.charAt(0).toUpperCase() + entity.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showApiKeyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowApiKeyModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Create API Key</h3>
              <button onClick={() => setShowApiKeyModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                <input type="text" placeholder="Key name" value={apiKeyForm.name} onChange={(e) => setApiKeyForm((p) => ({ ...p, name: e.target.value }))} className="input-field w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expires In (Days)</label>
                <input type="number" placeholder="90" value={apiKeyForm.expires_in_days} onChange={(e) => setApiKeyForm((p) => ({ ...p, expires_in_days: Number(e.target.value) }))} className="input-field w-full" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowApiKeyModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleCreateApiKey} disabled={saving || !apiKeyForm.name.trim()} className="btn-primary disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {saving ? ' Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {newApiKey && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setNewApiKey(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">API Key Created</h3>
              <button onClick={() => setNewApiKey(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg mb-4">
              <p className="text-sm text-amber-700 dark:text-amber-400 font-medium mb-2">Copy this key now. You will not be able to see it again.</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-2 bg-white dark:bg-gray-800 rounded text-xs font-mono break-all border border-gray-200 dark:border-gray-700">{newApiKey.key || newApiKey.raw_key}</code>
                <button onClick={() => copyToClipboard(newApiKey.key || newApiKey.raw_key)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500" title="Copy">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
            <button onClick={() => setNewApiKey(null)} className="btn-primary w-full">Done</button>
          </div>
        </div>
      )}

      {showGovernanceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowGovernanceModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{editingGov ? 'Edit Governance Rule' : 'Add Governance Rule'}</h3>
              <button onClick={() => setShowGovernanceModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Entity Type *</label>
                <input type="text" placeholder="e.g. company, branch, policy" value={govForm.entity_type} onChange={(e) => setGovForm((p) => ({ ...p, entity_type: e.target.value }))} className="input-field w-full" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Retention (Days)</label>
                  <input type="number" value={govForm.retention_days} onChange={(e) => setGovForm((p) => ({ ...p, retention_days: Number(e.target.value) }))} className="input-field w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Archive After</label>
                  <input type="number" value={govForm.archive_after_days} onChange={(e) => setGovForm((p) => ({ ...p, archive_after_days: Number(e.target.value) }))} className="input-field w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Purge After</label>
                  <input type="number" value={govForm.purge_after_days} onChange={(e) => setGovForm((p) => ({ ...p, purge_after_days: Number(e.target.value) }))} className="input-field w-full" />
                </div>
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={govForm.legal_hold} onChange={(e) => setGovForm((p) => ({ ...p, legal_hold: e.target.checked }))} className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Legal Hold</span>
              </label>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowGovernanceModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSaveGovernance} disabled={saving || !govForm.entity_type.trim()} className="btn-primary disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {saving ? ' Saving...' : (editingGov ? 'Update' : 'Create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showOrchModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowOrchModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{editingOrch ? 'Edit Orchestration Rule' : 'Add Orchestration Rule'}</h3>
              <button onClick={() => setShowOrchModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                <input type="text" placeholder="Rule name" value={orchForm.name} onChange={(e) => setOrchForm((p) => ({ ...p, name: e.target.value }))} className="input-field w-full" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Trigger Event</label>
                  <input type="text" placeholder="e.g. risk.updated, company.created" value={orchForm.trigger_event} onChange={(e) => setOrchForm((p) => ({ ...p, trigger_event: e.target.value }))} className="input-field w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                  <select value={orchForm.priority} onChange={(e) => setOrchForm((p) => ({ ...p, priority: e.target.value }))} className="input-field w-full">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Channels</label>
                  <input type="text" placeholder="email, slack, webhook" value={orchForm.channels} onChange={(e) => setOrchForm((p) => ({ ...p, channels: e.target.value }))} className="input-field w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Escalation (min)</label>
                  <input type="number" placeholder="30" value={orchForm.escalation_minutes} onChange={(e) => setOrchForm((p) => ({ ...p, escalation_minutes: Number(e.target.value) }))} className="input-field w-full" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowOrchModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSaveOrchestration} disabled={saving || !orchForm.name.trim()} className="btn-primary disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {saving ? ' Saving...' : (editingOrch ? 'Update' : 'Create')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
