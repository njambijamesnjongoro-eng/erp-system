import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, RefreshCw, Activity, MapPin, Clock } from 'lucide-react';
import { securityPhase2Api } from '../../api/securityPhase2';
import { formatDateTime } from '../../utils/helpers';

export function SecurityRiskDashboard() {
  const [riskSummary, setRiskSummary] = useState(null);
  const [suspicious, setSuspicious] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [globalStats, setGlobalStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [riskRes, suspRes, alertsRes, globalRes] = await Promise.all([
        securityPhase2Api.getRiskSummary(),
        securityPhase2Api.getSuspiciousActivities(20),
        securityPhase2Api.getAlerts(false, 20),
        securityPhase2Api.getGlobalLoginStats(),
      ]);
      setRiskSummary(riskRes.data?.data || {});
      setSuspicious(suspRes.data?.data || []);
      setAlerts(alertsRes.data?.data || []);
      setGlobalStats(globalRes.data?.data || {});
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleResolve = async (id) => {
    try {
      await securityPhase2Api.resolveSuspiciousActivity(id);
      load();
    } catch (err) { alert(err.message); }
  };

  const handleMarkRead = async (id) => {
    try {
      await securityPhase2Api.markAlertRead(id);
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a));
    } catch (err) { console.error(err); }
  };

  const getRiskColor = (score) => {
    if (score >= 75) return 'text-red-600';
    if (score >= 50) return 'text-amber-600';
    if (score >= 25) return 'text-orange-600';
    return 'text-emerald-600';
  };

  const getSeverityIcon = (severity) => {
    const map = { critical: 'text-red-500', high: 'text-orange-500', medium: 'text-amber-500', low: 'text-blue-500', info: 'text-gray-400' };
    return <AlertTriangle className={`w-4 h-4 ${map[severity] || 'text-gray-400'}`} />;
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Security Risk Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Monitor login risks, suspicious activities, and security alerts</p>
        </div>
        <button onClick={load} className="btn-secondary gap-2"><RefreshCw className="w-4 h-4" /> Refresh</button>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center"><Activity className="w-5 h-5 text-blue-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Current Risk</p>
                <p className={`text-xl font-bold ${getRiskColor(riskSummary?.currentRisk?.risk_score || 0)}`}>
                  {riskSummary?.currentRisk?.risk_score ?? 'N/A'}
                </p>
                <p className="text-xs text-gray-400">{riskSummary?.currentRisk?.risk_level || 'No data'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-amber-600" /></div>
              <div>
                <p className="text-sm text-gray-500">High Risk (7d)</p>
                <p className="text-xl font-bold text-amber-600">{riskSummary?.highRiskEvents7d ?? 0}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center"><XCircle className="w-5 h-5 text-red-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Unresolved Suspicious</p>
                <p className="text-xl font-bold text-red-600">{riskSummary?.unresolvedSuspicious ?? 0}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center"><Shield className="w-5 h-5 text-violet-600" /></div>
              <div>
                <p className="text-sm text-gray-500">24h Logins</p>
                <p className="text-xl font-bold text-violet-600">{globalStats?.totalLogins24h ?? 0}</p>
                <p className="text-xs text-gray-400">{globalStats?.failedLogins24h ?? 0} failed</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit">
        {['overview', 'suspicious', 'alerts'].map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-md capitalize ${activeTab === t ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && globalStats && (
        <div className="card">
          <div className="card-body">
            <h3 className="font-semibold mb-4">Global Activity (Last 24 Hours)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Logins', value: globalStats.totalLogins24h, color: 'text-blue-600' },
                { label: 'Failed Logins', value: globalStats.failedLogins24h, color: 'text-red-600' },
                { label: 'Active Users', value: globalStats.activeUsers24h, color: 'text-emerald-600' },
                { label: 'Unique IPs', value: globalStats.uniqueIPs24h, color: 'text-violet-600' },
              ].map(s => (
                <div key={s.label} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-sm text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'suspicious' && (
        <div className="card">
          <div className="card-header"><h3 className="font-semibold">Suspicious Activities</h3></div>
          <div className="card-body p-0">
            {suspicious.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-gray-400">
                <Shield className="w-8 h-8 mb-2" />
                <p className="text-sm">No suspicious activities detected</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead><tr><th>Severity</th><th>Type</th><th>Description</th><th>IP</th><th>Risk</th><th>Date</th><th></th></tr></thead>
                  <tbody>
                    {suspicious.map(s => (
                      <tr key={s.id}>
                        <td>{getSeverityIcon(s.severity)}</td>
                        <td className="text-sm font-medium">{s.activity_type}</td>
                        <td className="text-sm max-w-[250px] truncate">{s.description}</td>
                        <td className="font-mono text-sm">{s.ip_address || '-'}</td>
                        <td><span className={`font-bold ${getRiskColor(s.risk_score)}`}>{s.risk_score}</span></td>
                        <td className="text-sm text-gray-500">{formatDateTime(s.created_at)}</td>
                        <td>
                          {!s.is_resolved && (
                            <button onClick={() => handleResolve(s.id)} className="text-xs text-emerald-600 hover:underline">Resolve</button>
                          )}
                          {s.is_resolved && <CheckCircle className="w-4 h-4 text-emerald-500" />}
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

      {activeTab === 'alerts' && (
        <div className="card">
          <div className="card-header"><h3 className="font-semibold">Security Alerts</h3></div>
          <div className="card-body p-0">
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-gray-400">
                <Shield className="w-8 h-8 mb-2" />
                <p className="text-sm">No security alerts</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {alerts.map(a => (
                  <div key={a.id} className={`p-4 ${!a.is_read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {getSeverityIcon(a.severity)}
                        <div>
                          <p className="font-medium text-sm">{a.title}</p>
                          <p className="text-sm text-gray-500 mt-0.5">{a.message}</p>
                          <p className="text-xs text-gray-400 mt-1">{formatDateTime(a.created_at)}</p>
                        </div>
                      </div>
                      {!a.is_read && (
                        <button onClick={() => handleMarkRead(a.id)} className="text-xs text-primary-600 hover:underline flex-shrink-0">Dismiss</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
