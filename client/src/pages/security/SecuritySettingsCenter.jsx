import { useState, useEffect } from 'react';
import { Shield, Smartphone, Monitor, Globe, Key, AlertTriangle, Bell, Eye, EyeOff, CheckCircle, RefreshCw, LogOut } from 'lucide-react';
import { securityApi } from '../../api/security';
import { securityPhase2Api } from '../../api/securityPhase2';
import { changePassword } from '../../api/auth';
import { formatDateTime } from '../../utils/helpers';

export function SecuritySettingsCenter() {
  const [tab, setTab] = useState('overview');

  // Overview
  const [mfaStatus, setMfaStatus] = useState(null);
  const [riskSummary, setRiskSummary] = useState(null);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [devices, setDevices] = useState([]);

  // Password change
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });

  // Sessions
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // Login history
  const [loginHistory, setLoginHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Alerts
  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(false);

  const loadOverview = async () => {
    try {
      const [mfaRes, riskRes, alertRes] = await Promise.all([
        securityPhase2Api.getMFAStatus(),
        securityPhase2Api.getRiskSummary(),
        securityPhase2Api.getUnreadAlertCount(),
      ]);
      setMfaStatus(mfaRes.data?.data);
      setRiskSummary(riskRes.data?.data);
      setUnreadAlerts(alertRes.data?.data?.count || 0);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    loadOverview();
    if (tab === 'sessions') {
      setSessionsLoading(true);
      securityApi.getSessions().then(({ data }) => setSessions(data.data || [])).finally(() => setSessionsLoading(false));
    } else if (tab === 'history') {
      setHistoryLoading(true);
      securityPhase2Api.getLoginHistory(50).then(({ data }) => setLoginHistory(data.data || [])).finally(() => setHistoryLoading(false));
    } else if (tab === 'alerts') {
      setAlertsLoading(true);
      securityPhase2Api.getAlerts(false, 50).then(({ data }) => setAlerts(data.data || [])).finally(() => setAlertsLoading(false));
    } else if (tab === 'devices') {
      securityPhase2Api.getDevices().then(({ data }) => setDevices(data.data || [])).catch(() => {});
    }
  }, [tab]);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');
    if (pwForm.newPassword !== pwForm.confirmPassword) { setPwError('Passwords do not match'); return; }
    if (pwForm.newPassword.length < 12) { setPwError('Password must be at least 12 characters'); return; }
    setPwLoading(true);
    try {
      const { data } = await changePassword(pwForm.currentPassword, pwForm.newPassword);
      setPwSuccess(data.message || 'Password changed successfully');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) { setPwError(err.response?.data?.message || err.message); } finally { setPwLoading(false); }
  };

  const handleTerminateSession = async (id) => {
    try { await securityApi.terminateSession(id); setSessions(prev => prev.filter(s => s.id !== id)); }
    catch (err) { alert(err.message); }
  };

  const handleMarkAllRead = async () => {
    try { await securityPhase2Api.markAllAlertsRead(); setAlerts(prev => prev.map(a => ({ ...a, is_read: true }))); }
    catch (err) { console.error(err); }
  };

  const handleApproveDevice = async (id) => {
    try { await securityPhase2Api.approveDevice(id); loadOverview(); } catch (err) { alert(err.message); }
  };

  const handleRevokeDevice = async (id) => {
    if (!confirm('Revoke this device?')) return;
    try { await securityPhase2Api.revokeDevice(id); setDevices(prev => prev.filter(d => d.id !== id)); }
    catch (err) { alert(err.message); }
  };

  const tabs = [
    { key: 'overview', label: 'Overview', icon: Shield },
    { key: 'password', label: 'Password', icon: Key },
    { key: 'sessions', label: 'Sessions', icon: LogOut },
    { key: 'devices', label: 'Devices', icon: Monitor },
    { key: 'history', label: 'Login History', icon: Globe },
    { key: 'alerts', label: 'Alerts', icon: Bell },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Security Settings Center</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Manage all your account security settings in one place</p>
      </div>

      <div className="flex flex-wrap gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${tab === t.key ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <t.icon className="w-4 h-4" />
            {t.label}
            {t.key === 'alerts' && unreadAlerts > 0 && <span className="ml-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{unreadAlerts}</span>}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card">
              <div className="card-body flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center"><Shield className="w-5 h-5 text-primary-600" /></div>
                <div>
                  <p className="text-sm text-gray-500">MFA</p>
                  <p className="font-bold">{mfaStatus?.enabled ? mfaStatus.method.toUpperCase() : 'Off'}</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="card-body flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-amber-600" /></div>
                <div>
                  <p className="text-sm text-gray-500">Risk Level</p>
                  <p className="font-bold capitalize">{riskSummary?.currentRisk?.risk_level || 'N/A'}</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="card-body flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center"><Bell className="w-5 h-5 text-red-600" /></div>
                <div>
                  <p className="text-sm text-gray-500">Unread Alerts</p>
                  <p className="font-bold text-red-600">{unreadAlerts}</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="card-body flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center"><Smartphone className="w-5 h-5 text-violet-600" /></div>
                <div>
                  <p className="text-sm text-gray-500">High Risk (7d)</p>
                  <p className="font-bold text-violet-600">{riskSummary?.highRiskEvents7d || 0}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h3 className="font-semibold mb-2">Security Recommendations</h3>
              <div className="space-y-2">
                {!mfaStatus?.enabled && (
                  <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg">
                    <div className="flex items-center gap-2 text-sm"><AlertTriangle className="w-4 h-4 text-amber-600" /> Enable multi-factor authentication</div>
                    <button onClick={() => setTab('overview')} className="btn-primary btn-sm">Set Up</button>
                  </div>
                )}
                {riskSummary?.unresolvedSuspicious > 0 && (
                  <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/10 rounded-lg">
                    <div className="flex items-center gap-2 text-sm"><AlertTriangle className="w-4 h-4 text-red-600" /> {riskSummary.unresolvedSuspicious} unresolved suspicious activit{riskSummary.unresolvedSuspicious > 1 ? 'ies' : 'y'}</div>
                    <button onClick={() => setTab('overview')} className="btn-danger btn-sm">Review</button>
                  </div>
                )}
                {unreadAlerts > 0 && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg flex items-center gap-2 text-sm"><Bell className="w-4 h-4 text-blue-600" /> {unreadAlerts} unread alert{unreadAlerts > 1 ? 's' : ''}</div>
                )}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h3 className="font-semibold mb-2">Quick Actions</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <button onClick={() => setTab('password')} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm font-medium hover:bg-gray-100 text-left">Change Password</button>
                <button onClick={() => setTab('sessions')} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm font-medium hover:bg-gray-100 text-left">View Sessions</button>
                <button onClick={() => window.location.href = '/security/settings/mfa'} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm font-medium hover:bg-gray-100 text-left">MFA Settings</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'password' && (
        <div className="card max-w-lg">
          <div className="card-body">
            <h3 className="font-semibold mb-1">Change Password</h3>
            <p className="text-sm text-gray-500 mb-4">Password must be at least 12 characters with uppercase, lowercase, number, and special character</p>
            {pwError && <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"><AlertTriangle className="w-4 h-4" /> {pwError}</div>}
            {pwSuccess && <div className="flex items-center gap-2 p-3 mb-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm"><CheckCircle className="w-4 h-4" /> {pwSuccess}</div>}
            <form onSubmit={handlePasswordChange} className="space-y-4">
              {['currentPassword', 'newPassword', 'confirmPassword'].map(f => (
                <div key={f}>
                  <label className="input-label">{f === 'currentPassword' ? 'Current' : f === 'newPassword' ? 'New' : 'Confirm'} Password</label>
                  <div className="relative">
                    <input type={showPw[f.replace('Password', '')] ? 'text' : 'password'} value={pwForm[f]}
                      onChange={e => setPwForm({ ...pwForm, [f]: e.target.value })} className="input-field w-full pr-10"
                      autoComplete={f === 'currentPassword' ? 'current-password' : 'new-password'} />
                    <button type="button" onClick={() => setShowPw({ ...showPw, [f.replace('Password', '')]: !showPw[f.replace('Password', '')] })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><EyeOff className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
              <button type="submit" disabled={pwLoading || !pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirmPassword} className="btn-primary">
                {pwLoading ? 'Changing...' : 'Change Password'}
              </button>
            </form>
          </div>
        </div>
      )}

      {tab === 'sessions' && (
        <div className="card">
          <div className="card-body">
            <h3 className="font-semibold mb-4">Active Sessions</h3>
            {sessionsLoading ? <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" /></div>
            : sessions.length === 0 ? <div className="text-center py-8 text-gray-400"><LogOut className="w-8 h-8 mx-auto mb-2" /><p>No active sessions</p></div>
            : <div className="space-y-3">
                {sessions.map(s => (
                  <div key={s.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-3">
                      <Monitor className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-sm">{s.device || 'Unknown device'}</p>
                        <p className="text-xs text-gray-400">IP: {s.ip_address} · {formatDateTime(s.login_at)}</p>
                      </div>
                    </div>
                    <button onClick={() => handleTerminateSession(s.id)} className="btn-danger btn-sm">Terminate</button>
                  </div>
                ))}
              </div>
            }
          </div>
        </div>
      )}

      {tab === 'devices' && (
        <div className="card">
          <div className="card-body">
            <h3 className="font-semibold mb-4">Trusted Devices</h3>
            {devices.length === 0 ? (
              <div className="text-center py-8 text-gray-400"><Monitor className="w-8 h-8 mx-auto mb-2" /><p>No devices registered</p></div>
            ) : (
              <div className="space-y-3">
                {devices.map(d => (
                  <div key={d.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center"><Smartphone className="w-4 h-4" /></div>
                      <div>
                        <p className="font-medium text-sm">{d.device_name || 'Unknown'} {d.is_trusted && <span className="text-xs text-emerald-600">(Trusted)</span>}</p>
                        <p className="text-xs text-gray-400">{d.browser || ''}{d.os ? ` · ${d.os}` : ''} · Last: {formatDateTime(d.last_seen_at)}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!d.is_trusted && <button onClick={() => handleApproveDevice(d.id)} className="btn-primary btn-sm">Trust</button>}
                      <button onClick={() => handleRevokeDevice(d.id)} className="btn-danger btn-sm">Revoke</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="card">
          <div className="card-body p-0">
            <div className="p-4 border-b border-gray-100"><h3 className="font-semibold">Recent Login Activity</h3></div>
            {historyLoading ? <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" /></div>
            : loginHistory.length === 0 ? <div className="text-center py-8 text-gray-400"><Globe className="w-8 h-8 mx-auto mb-2" /><p>No login history</p></div>
            : <div className="overflow-x-auto">
                <table className="data-table">
                  <thead><tr><th>Date</th><th>Location</th><th>IP</th><th>Risk</th></tr></thead>
                  <tbody>
                    {loginHistory.slice(0, 25).map(h => (
                      <tr key={h.id}>
                        <td className="text-sm">{formatDateTime(h.created_at)}</td>
                        <td className="text-sm">{h.city || '?'}, {h.country || '?'}</td>
                        <td className="font-mono text-sm">{h.ip_address}</td>
                        <td><span className={`badge ${h.risk_level === 'high' || h.risk_level === 'critical' ? 'badge-red' : h.risk_level === 'medium' ? 'badge-warning' : 'badge-success'}`}>{h.risk_level || 'low'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            }
          </div>
        </div>
      )}

      {tab === 'alerts' && (
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="font-semibold">Security Alerts</h3>
            <button onClick={handleMarkAllRead} className="btn-secondary btn-sm">Mark All Read</button>
          </div>
          <div className="card-body p-0">
            {alertsLoading ? <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" /></div>
            : alerts.length === 0 ? <div className="text-center py-8 text-gray-400"><Bell className="w-8 h-8 mx-auto mb-2" /><p>No alerts</p></div>
            : <div className="divide-y divide-gray-100">
                {alerts.map(a => (
                  <div key={a.id} className={`p-4 ${!a.is_read ? 'bg-blue-50/50' : ''}`}>
                    <div className="flex items-start gap-3">
                      <AlertTriangle className={`w-4 h-4 mt-0.5 ${a.severity === 'high' || a.severity === 'critical' ? 'text-red-500' : 'text-amber-500'}`} />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{a.title}</p>
                        <p className="text-sm text-gray-500">{a.message}</p>
                        <p className="text-xs text-gray-400 mt-1">{formatDateTime(a.created_at)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            }
          </div>
        </div>
      )}
    </div>
  );
}
