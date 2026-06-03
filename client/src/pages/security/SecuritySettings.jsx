import { useState, useEffect } from 'react';
import { Key, Monitor, Shield, AlertTriangle, Smartphone, Trash2, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { securityApi } from '../../api/security';
import { changePassword } from '../../api/auth';
import { formatDateTime } from '../../utils/helpers';

export function SecuritySettings() {
  const [tab, setTab] = useState('password');

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });

  const [devices, setDevices] = useState([]);
  const [devicesLoading, setDevicesLoading] = useState(false);

  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    if (tab === 'devices') {
      setDevicesLoading(true);
      securityApi.getDevices().then(({ data }) => setDevices(data.data || data || [])).finally(() => setDevicesLoading(false));
    } else if (tab === 'events') {
      setEventsLoading(true);
      securityApi.getEvents(50).then(({ data }) => setEvents(data.data || data || [])).finally(() => setEventsLoading(false));
    } else if (tab === 'overview') {
      setStatsLoading(true);
      securityApi.getDashboardStats().then(({ data }) => setStats(data.data || data)).finally(() => setStatsLoading(false));
    }
  }, [tab]);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError('Passwords do not match');
      return;
    }
    if (pwForm.newPassword.length < 12) {
      setPwError('Password must be at least 12 characters');
      return;
    }
    setPwLoading(true);
    try {
      const { data } = await changePassword(pwForm.currentPassword, pwForm.newPassword);
      setPwSuccess(data.message || 'Password changed successfully');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPwError(err.response?.data?.message || err.message);
    } finally {
      setPwLoading(false);
    }
  };

  const handleRemoveDevice = async (id) => {
    if (!confirm('Remove this trusted device?')) return;
    try {
      await securityApi.removeDevice(id);
      setDevices(prev => prev.filter(d => d.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  const tabs = [
    { key: 'overview', label: 'Overview', icon: Shield },
    { key: 'password', label: 'Password', icon: Key },
    { key: 'devices', label: 'Devices', icon: Monitor },
    { key: 'events', label: 'Activity Log', icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Security Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your account security</p>
      </div>

      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${tab === t.key ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Locked Accounts', value: stats?.lockedAccounts ?? 0, color: 'text-red-600', bg: 'bg-red-50' },
            { label: 'Failed Logins (24h)', value: stats?.recentFailures ?? 0, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Active Sessions', value: stats?.activeSessions ?? 0, color: 'text-blue-600', bg: 'bg-blue-50' },
          ].map(s => (
            <div key={s.label} className="card">
              <div className="card-body flex items-center gap-4">
                <div className={`w-12 h-12 rounded-lg ${s.bg} flex items-center justify-center`}>
                  <Shield className={`w-6 h-6 ${s.color}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{s.label}</p>
                  <p className={`text-2xl font-bold ${s.color}`}>{statsLoading ? '...' : s.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'password' && (
        <div className="card max-w-lg">
          <div className="card-body">
            <h3 className="font-semibold mb-1">Change Password</h3>
            <p className="text-sm text-gray-500 mb-4">Password must be at least 12 characters with uppercase, lowercase, number, and special character</p>

            {pwError && <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg text-red-700 text-sm"><AlertCircle className="w-4 h-4" /> {pwError}</div>}
            {pwSuccess && <div className="flex items-center gap-2 p-3 mb-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 rounded-lg text-emerald-700 text-sm"><CheckCircle className="w-4 h-4" /> {pwSuccess}</div>}

            <form onSubmit={handlePasswordChange} className="space-y-4">
              {['currentPassword', 'newPassword', 'confirmPassword'].map(field => (
                <div key={field}>
                  <label className="input-label">
                    {field === 'currentPassword' ? 'Current Password' : field === 'newPassword' ? 'New Password' : 'Confirm New Password'}
                  </label>
                  <div className="relative">
                    <input type={showPw[field.replace('Password', '')] ? 'text' : 'password'} value={pwForm[field]}
                      onChange={e => setPwForm({ ...pwForm, [field]: e.target.value })}
                      className="input-field w-full pr-10" autoComplete={field === 'currentPassword' ? 'current-password' : 'new-password'} />
                    <button type="button" onClick={() => setShowPw({ ...showPw, [field.replace('Password', '')]: !showPw[field.replace('Password', '')] })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPw[field.replace('Password', '')] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
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

      {tab === 'devices' && (
        <div className="card">
          <div className="card-body">
            <h3 className="font-semibold mb-1">Trusted Devices</h3>
            <p className="text-sm text-gray-500 mb-4">Devices that have logged into your account</p>
            {devicesLoading ? (
              <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" /></div>
            ) : devices.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-gray-400"><Smartphone className="w-8 h-8 mb-2" /><p className="text-sm">No trusted devices</p></div>
            ) : (
              <div className="space-y-3">
                {devices.map(d => (
                  <div key={d.id} className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center"><Smartphone className="w-4 h-4" /></div>
                      <div>
                        <p className="font-medium text-sm">{d.device_name || 'Unknown device'}</p>
                        <p className="text-xs text-gray-400">
                          {d.browser || ''}{d.os ? ` · ${d.os}` : ''}{d.ip_address ? ` · ${d.ip_address}` : ''}
                          <span className="ml-1">· Last used: {formatDateTime(d.last_used_at)}</span>
                        </p>
                      </div>
                    </div>
                    <button onClick={() => handleRemoveDevice(d.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'events' && (
        <div className="card">
          <div className="card-body">
            <h3 className="font-semibold mb-1">Recent Security Events</h3>
            <p className="text-sm text-gray-500 mb-4">Last 50 security events on your account</p>
            {eventsLoading ? (
              <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" /></div>
            ) : events.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-gray-400"><Shield className="w-8 h-8 mb-2" /><p className="text-sm">No security events</p></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr><th>Type</th><th>Description</th><th>Severity</th><th>IP</th><th>Date</th></tr>
                  </thead>
                  <tbody>
                    {events.map(e => (
                      <tr key={e.id}>
                        <td><span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{e.event_type}</span></td>
                        <td className="text-sm max-w-[300px] truncate">{e.description}</td>
                        <td>
                          <span className={`badge ${e.severity === 'critical' ? 'badge-red' : e.severity === 'warning' ? 'badge-warning' : 'badge-gray'}`}>{e.severity}</span>
                        </td>
                        <td className="font-mono text-sm">{e.ip_address || '-'}</td>
                        <td className="text-sm text-gray-500">{formatDateTime(e.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
