import { useState, useEffect } from 'react';
import { Key, Eye, EyeOff, Copy, CheckCircle, XCircle, Activity, Clock, Plus, X, Search } from 'lucide-react';
import { apiKeyService } from '../../api/admin';
import { formatDate, formatDateTime } from '../../utils/helpers';

export function APIMonitor() {
  const [activeTab, setActiveTab] = useState('keys');
  const [keys, setKeys] = useState([]);
  const [usageLogs, setUsageLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', permissions: 'read', rate_limit: 100 });
  const [newKeyValue, setNewKeyValue] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadKeys = async () => {
    setLoading(true);
    try {
      const { data } = await apiKeyService.list({ page, limit: 20 });
      setKeys(data.data || data || []);
      setTotalPages(data.pagination?.totalPages || data.totalPages || 1);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const loadLogs = async () => {
    setLoading(true);
    try {
      const { data } = await apiKeyService.getLogs({ page, limit: 20 });
      setUsageLogs(data.data || data || []);
      setTotalPages(data.pagination?.totalPages || data.totalPages || 1);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { loadKeys(); }, [page]);
  useEffect(() => { setPage(1); }, [activeTab]);
  useEffect(() => { if (activeTab === 'logs') loadLogs(); }, [activeTab, page]);

  const handleCreate = async () => {
    try {
      const { data } = await apiKeyService.create(createForm);
      setNewKeyValue(data.data?.full_key || data.full_key || data.key || '');
      setShowCreateModal(false);
      loadKeys();
    } catch (err) { alert(err.message); }
  };

  const handleRevoke = async (id) => {
    if (!confirm('Revoke this API key? This cannot be undone.')) return;
    try { await apiKeyService.revoke(id); loadKeys(); } catch (err) { alert(err.message); }
  };

  const copyKey = (val) => {
    navigator.clipboard?.writeText(val).then(() => {});
  };

  const stats = {
    totalCalls: usageLogs.reduce((s, l) => s + (l.call_count || l.request_count || 0), 0),
    avgResponseTime: usageLogs.length > 0 ? Math.round(usageLogs.reduce((s, l) => s + (l.response_time || l.duration || 0), 0) / usageLogs.length) : 0,
    errorRate: usageLogs.length > 0 ? ((usageLogs.filter(l => l.status_code >= 400).length / usageLogs.length) * 100).toFixed(1) : 0,
  };

  const tabs = [
    { key: 'keys', label: 'API Keys' },
    { key: 'logs', label: 'Usage Logs' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">API Monitor</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage API keys and monitor usage</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary gap-2"><Plus className="w-4 h-4" /> Create API Key</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card">
          <div className="card-body flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center"><Activity className="w-6 h-6 text-blue-600" /></div>
            <div><p className="text-sm text-gray-500">Total Calls</p><p className="text-xl font-bold text-blue-600">{stats.totalCalls}</p></div>
          </div>
        </div>
        <div className="card">
          <div className="card-body flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-emerald-50 flex items-center justify-center"><Clock className="w-6 h-6 text-emerald-600" /></div>
            <div><p className="text-sm text-gray-500">Avg Response Time</p><p className="text-xl font-bold text-emerald-600">{stats.avgResponseTime}ms</p></div>
          </div>
        </div>
        <div className="card">
          <div className="card-body flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center"><XCircle className="w-6 h-6 text-red-600" /></div>
            <div><p className="text-sm text-gray-500">Error Rate</p><p className="text-xl font-bold text-red-600">{stats.errorRate}%</p></div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex gap-1">
            {tabs.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === tab.key ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="card-body p-0">
          {activeTab === 'keys' && (
            <>
              {loading ? (
                <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
              ) : keys.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <Key className="w-12 h-12 mb-3 opacity-50" />
                  <p className="text-lg font-medium">No API keys</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr><th>Name</th><th>Prefix</th><th>Status</th><th>Last Used</th><th>Created</th><th className="text-right">Actions</th></tr>
                    </thead>
                    <tbody>
                      {keys.map((k) => (
                        <tr key={k.id}>
                          <td className="font-medium">{k.name}</td>
                          <td className="font-mono text-sm">
                            <code className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                              {k.prefix || (k.key ? k.key.slice(0, 8) : '')}***
                            </code>
                          </td>
                          <td>{k.is_active !== false && k.status !== 'revoked' ? <span className="badge badge-success">Active</span> : <span className="badge badge-red">Revoked</span>}</td>
                          <td className="text-sm text-gray-500">{k.last_used ? formatDate(k.last_used) : 'Never'}</td>
                          <td className="text-sm text-gray-500">{formatDate(k.created_at)}</td>
                          <td className="text-right">
                            <button onClick={() => handleRevoke(k.id)} disabled={k.status === 'revoked'} className="text-sm text-red-500 hover:underline disabled:opacity-50">Revoke</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {activeTab === 'logs' && (
            <>
              {loading ? (
                <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
              ) : usageLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <Activity className="w-12 h-12 mb-3 opacity-50" />
                  <p className="text-lg font-medium">No usage logs</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr><th>Endpoint</th><th>Method</th><th>Status</th><th>Response Time</th><th>Date</th></tr>
                    </thead>
                    <tbody>
                      {usageLogs.map((log, i) => (
                        <tr key={log.id || i}>
                          <td className="font-mono text-sm max-w-[200px] truncate">{log.endpoint || log.path || '-'}</td>
                          <td><span className="badge badge-info">{log.method || 'GET'}</span></td>
                          <td>
                            {log.status_code >= 200 && log.status_code < 300 ? (
                              <span className="badge badge-success">{log.status_code}</span>
                            ) : log.status_code >= 400 ? (
                              <span className="badge badge-red">{log.status_code}</span>
                            ) : (
                              <span className="badge badge-gray">{log.status_code || '-'}</span>
                            )}
                          </td>
                          <td className="text-sm">{log.response_time != null ? `${log.response_time}ms` : log.duration ? `${log.duration}ms` : '-'}</td>
                          <td className="text-sm text-gray-500">{formatDateTime(log.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        {totalPages > 1 && (
          <div className="card-footer flex items-center justify-between">
            <p className="text-sm text-gray-400">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-secondary btn-sm disabled:opacity-50">Previous</button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary btn-sm disabled:opacity-50">Next</button>
            </div>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Create API Key</h3>
            <div className="space-y-4">
              <input placeholder="Key Name *" value={createForm.name} onChange={(e) => setCreateForm({...createForm, name: e.target.value})} className="input-field w-full" />
              <div>
                <label className="block text-sm mb-1">Permissions</label>
                <select value={createForm.permissions} onChange={(e) => setCreateForm({...createForm, permissions: e.target.value})} className="input-field w-full">
                  <option value="read">Read Only</option>
                  <option value="read_write">Read & Write</option>
                  <option value="full_access">Full Access</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Rate Limit (requests/min)</label>
                <input type="number" value={createForm.rate_limit} onChange={(e) => setCreateForm({...createForm, rate_limit: parseInt(e.target.value) || 100})} className="input-field w-full" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowCreateModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleCreate} disabled={!createForm.name} className="btn-primary">Create Key</button>
            </div>
          </div>
        </div>
      )}

      {newKeyValue && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setNewKeyValue('')}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">API Key Created</h3>
              <button onClick={() => setNewKeyValue('')} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg mb-4">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-2">Copy this key now. You won't be able to see it again!</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm font-mono bg-white dark:bg-gray-900 p-2 rounded border break-all">{newKeyValue}</code>
                <button onClick={() => copyKey(newKeyValue)} className="p-2 hover:bg-white dark:hover:bg-gray-800 rounded-lg" title="Copy"><Copy className="w-4 h-4 text-blue-500" /></button>
              </div>
            </div>
            <div className="flex justify-end">
              <button onClick={() => setNewKeyValue('')} className="btn-primary">Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
