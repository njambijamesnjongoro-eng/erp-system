import { useState, useEffect } from 'react';
import { Monitor, Smartphone, Globe, XCircle, LogOut, RefreshCw } from 'lucide-react';
import { securityApi } from '../../api/security';
import { formatDateTime } from '../../utils/helpers';

export function SessionManagement() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentSessionId, setCurrentSessionId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await securityApi.getSessions();
      const list = data.data || data || [];
      setSessions(list);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleTerminate = async (id) => {
    try {
      await securityApi.terminateSession(id);
      setSessions(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleTerminateAll = async () => {
    if (!confirm('Terminate all other sessions? You will stay logged in on this device.')) return;
    try {
      await securityApi.terminateAllSessions(currentSessionId);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const getDeviceIcon = (ua) => {
    if (!ua) return <Monitor className="w-5 h-5" />;
    const l = ua.toLowerCase();
    if (l.includes('mobile') || l.includes('android') || l.includes('iphone')) return <Smartphone className="w-5 h-5" />;
    return <Monitor className="w-5 h-5" />;
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Session Management</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your active sessions</p>
        </div>
        <div className="flex gap-3">
          <button onClick={load} className="btn-secondary gap-2"><RefreshCw className="w-4 h-4" /> Refresh</button>
          {sessions.length > 1 && (
            <button onClick={handleTerminateAll} className="btn-danger gap-2"><LogOut className="w-4 h-4" /> Terminate Others</button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">{error}</div>
      )}

      {sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Globe className="w-12 h-12 mb-3" />
          <p className="text-lg">No active sessions</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => {
            const isCurrent = s.id === currentSessionId;
            return (
              <div key={s.id} className={`card ${isCurrent ? 'ring-2 ring-primary-500' : ''}`}>
                <div className="card-body flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      {getDeviceIcon(s.user_agent)}
                    </div>
                    <div>
                      <p className="font-medium">
                        {s.device || s.browser || 'Unknown device'}
                        {isCurrent && <span className="ml-2 text-xs text-primary-600 font-normal">(current session)</span>}
                      </p>
                      <p className="text-sm text-gray-500">
                        IP: {s.ip_address || 'Unknown'} &middot; Logged in: {formatDateTime(s.login_at || s.created_at)}
                        {s.last_activity && ` · Last active: ${formatDateTime(s.last_activity)}`}
                      </p>
                    </div>
                  </div>
                  {!isCurrent && (
                    <button onClick={() => handleTerminate(s.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500" title="Terminate session">
                      <XCircle className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
