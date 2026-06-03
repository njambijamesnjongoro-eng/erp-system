import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, X, RefreshCw, Ban, Plus, Trash2, Search } from 'lucide-react';
import { securityService } from '../../api/admin';
import { formatDateTime } from '../../utils/helpers';

export function SecurityMonitor() {
  const [summary, setSummary] = useState(null);
  const [events, setEvents] = useState([]);
  const [loginAttempts, setLoginAttempts] = useState([]);
  const [blacklist, setBlacklist] = useState([]);
  const [whitelist, setWhitelist] = useState([]);
  const [activeTab, setActiveTab] = useState('events');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [detecting, setDetecting] = useState(false);
  const [showAddBlacklist, setShowAddBlacklist] = useState(false);
  const [blacklistForm, setBlacklistForm] = useState({ ip_address: '', reason: '' });
  const [showAddWhitelist, setShowAddWhitelist] = useState(false);
  const [whitelistForm, setWhitelistForm] = useState({ ip_address: '', reason: '' });

  const load = async () => {
    setLoading(true);
    try {
      const [sumRes, evtRes] = await Promise.all([
        securityService.getSummary(),
        securityService.getEvents({ limit: 50 }),
      ]);
      setSummary(sumRes.data?.data || sumRes.data);
      setEvents(evtRes.data?.data || evtRes.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadLoginAttempts = async () => {
    try {
      const { data } = await securityService.getLoginAttempts({ limit: 50 });
      setLoginAttempts(data.data || data || []);
    } catch (err) { console.error(err); }
  };

  const loadLists = async () => {
    try {
      const [blRes, wlRes] = await Promise.all([
        securityService.getBlacklist(),
        securityService.getWhitelist(),
      ]);
      setBlacklist(blRes.data?.data || blRes.data || []);
      setWhitelist(wlRes.data?.data || wlRes.data || []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (activeTab === 'login-attempts') loadLoginAttempts();
    if (activeTab === 'ip-management') loadLists();
  }, [activeTab]);

  const handleResolve = async (id) => {
    try {
      await securityService.resolveEvent(id);
      setEvents(prev => prev.map(e => e.id === id ? { ...e, status: 'resolved' } : e));
    } catch (err) { alert(err.message); }
  };

  const handleDetect = async () => {
    setDetecting(true);
    try {
      const { data } = await securityService.detectThreats();
      alert(data.message || 'Threat detection complete');
      load();
    } catch (err) { alert(err.message); } finally { setDetecting(false); }
  };

  const handleAddBlacklist = async () => {
    try {
      await securityService.addToBlacklist(blacklistForm);
      setShowAddBlacklist(false);
      setBlacklistForm({ ip_address: '', reason: '' });
      loadLists();
    } catch (err) { alert(err.message); }
  };

  const handleRemoveBlacklist = async (id) => {
    try { await securityService.removeFromBlacklist(id); loadLists(); } catch (err) { alert(err.message); }
  };

  const handleAddWhitelist = async () => {
    try {
      await securityService.addToWhitelist(whitelistForm);
      setShowAddWhitelist(false);
      setWhitelistForm({ ip_address: '', reason: '' });
      loadLists();
    } catch (err) { alert(err.message); }
  };

  const handleRemoveWhitelist = async (id) => {
    try { await securityService.removeFromWhitelist(id); loadLists(); } catch (err) { alert(err.message); }
  };

  const getSeverityBadge = (severity) => {
    const map = { critical: 'badge-red', high: 'badge-orange', medium: 'badge-warning', low: 'badge-info', info: 'badge-gray' };
    return <span className={`badge ${map[severity] || 'badge-gray'}`}>{severity}</span>;
  };

  const tabs = [
    { key: 'events', label: 'Events' },
    { key: 'login-attempts', label: 'Login Attempts' },
    { key: 'ip-management', label: 'IP Management' },
  ];

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;
  if (error) return <div className="text-red-500 p-4">Error loading security data: {error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Security Monitor</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Security event monitoring and IP management</p>
        </div>
        <button onClick={handleDetect} disabled={detecting} className="btn-primary gap-2">
          {detecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
          {detecting ? 'Scanning...' : 'Detect Threats'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="card-body flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center"><Shield className="w-6 h-6 text-blue-600" /></div>
            <div><p className="text-sm text-gray-500">Total Events</p><p className="text-xl font-bold text-blue-600">{summary?.total_events ?? events.length}</p></div>
          </div>
        </div>
        <div className="card">
          <div className="card-body flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center"><AlertTriangle className="w-6 h-6 text-red-600" /></div>
            <div><p className="text-sm text-gray-500">Critical</p><p className="text-xl font-bold text-red-600">{summary?.critical ?? events.filter(e => e.severity === 'critical').length}</p></div>
          </div>
        </div>
        <div className="card">
          <div className="card-body flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-amber-50 flex items-center justify-center"><AlertTriangle className="w-6 h-6 text-amber-600" /></div>
            <div><p className="text-sm text-gray-500">Unresolved</p><p className="text-xl font-bold text-amber-600">{summary?.unresolved ?? events.filter(e => e.status !== 'resolved').length}</p></div>
          </div>
        </div>
        <div className="card">
          <div className="card-body flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-violet-50 flex items-center justify-center"><Ban className="w-6 h-6 text-violet-600" /></div>
            <div><p className="text-sm text-gray-500">Blocked IPs</p><p className="text-xl font-bold text-violet-600">{summary?.blocked_ips ?? blacklist.length}</p></div>
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
          {activeTab === 'events' && (
            <>
              {events.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <Shield className="w-8 h-8 mb-2" />
                  <p className="text-sm">No security events</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr><th>Severity</th><th>Title</th><th>Type</th><th>Source IP</th><th>Date</th><th>Status</th><th></th></tr>
                    </thead>
                    <tbody>
                      {events.map((evt) => (
                        <tr key={evt.id}>
                          <td>{getSeverityBadge(evt.severity)}</td>
                          <td className="font-medium max-w-[200px] truncate">{evt.title}</td>
                          <td className="text-sm">{evt.event_type || evt.type}</td>
                          <td className="font-mono text-sm">{evt.source_ip || evt.ip_address || '-'}</td>
                          <td className="text-sm text-gray-500">{formatDateTime(evt.created_at)}</td>
                          <td>{evt.status === 'resolved' ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <AlertTriangle className="w-4 h-4 text-amber-500" />}</td>
                          <td>
                            {evt.status !== 'resolved' && (
                              <button onClick={() => handleResolve(evt.id)} className="text-sm text-emerald-600 hover:underline">Resolve</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {activeTab === 'login-attempts' && (
            <>
              {loginAttempts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <Shield className="w-8 h-8 mb-2" />
                  <p className="text-sm">No login attempts recorded</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr><th>Email</th><th>IP Address</th><th>Status</th><th>Reason</th><th>Timestamp</th></tr>
                    </thead>
                    <tbody>
                      {loginAttempts.map((a) => (
                        <tr key={a.id}>
                          <td className="text-sm">{a.email}</td>
                          <td className="font-mono text-sm">{a.ip_address}</td>
                          <td>{a.success ? <span className="badge badge-success">Success</span> : <span className="badge badge-red">Failed</span>}</td>
                          <td className="text-sm text-gray-500">{a.reason || '-'}</td>
                          <td className="text-sm text-gray-500">{formatDateTime(a.created_at || a.timestamp)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {activeTab === 'ip-management' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold flex items-center gap-2"><Ban className="w-4 h-4 text-red-500" /> Blacklist</h3>
                  <button onClick={() => setShowAddBlacklist(true)} className="btn-primary btn-sm gap-1"><Plus className="w-3 h-3" /> Add</button>
                </div>
                {blacklist.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4 text-center">No blacklisted IPs</p>
                ) : (
                  <div className="space-y-2">
                    {blacklist.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div>
                          <p className="font-mono text-sm font-medium">{item.ip_address}</p>
                          <p className="text-xs text-gray-400">{item.reason || 'No reason'}</p>
                        </div>
                        <button onClick={() => handleRemoveBlacklist(item.id)} className="p-1 hover:bg-red-100 rounded-lg text-red-500"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> Whitelist</h3>
                  <button onClick={() => setShowAddWhitelist(true)} className="btn-primary btn-sm gap-1"><Plus className="w-3 h-3" /> Add</button>
                </div>
                {whitelist.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4 text-center">No whitelisted IPs</p>
                ) : (
                  <div className="space-y-2">
                    {whitelist.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div>
                          <p className="font-mono text-sm font-medium">{item.ip_address}</p>
                          <p className="text-xs text-gray-400">{item.reason || 'No reason'}</p>
                        </div>
                        <button onClick={() => handleRemoveWhitelist(item.id)} className="p-1 hover:bg-red-100 rounded-lg text-red-500"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showAddBlacklist && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddBlacklist(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Add to Blacklist</h3>
            <div className="space-y-4">
              <input placeholder="IP Address *" value={blacklistForm.ip_address} onChange={(e) => setBlacklistForm({...blacklistForm, ip_address: e.target.value})} className="input-field w-full" />
              <textarea placeholder="Reason" value={blacklistForm.reason} onChange={(e) => setBlacklistForm({...blacklistForm, reason: e.target.value})} className="input-field w-full" rows={3} />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowAddBlacklist(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleAddBlacklist} disabled={!blacklistForm.ip_address} className="btn-danger">Block IP</button>
            </div>
          </div>
        </div>
      )}

      {showAddWhitelist && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddWhitelist(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Add to Whitelist</h3>
            <div className="space-y-4">
              <input placeholder="IP Address *" value={whitelistForm.ip_address} onChange={(e) => setWhitelistForm({...whitelistForm, ip_address: e.target.value})} className="input-field w-full" />
              <textarea placeholder="Reason" value={whitelistForm.reason} onChange={(e) => setWhitelistForm({...whitelistForm, reason: e.target.value})} className="input-field w-full" rows={3} />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowAddWhitelist(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleAddWhitelist} disabled={!whitelistForm.ip_address} className="btn-primary">Add IP</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
