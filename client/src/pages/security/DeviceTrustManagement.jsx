import { useState, useEffect } from 'react';
import { Smartphone, Monitor, Globe, CheckCircle, XCircle, AlertTriangle, Search, RefreshCw } from 'lucide-react';
import { securityPhase2Api } from '../../api/securityPhase2';
import { formatDateTime } from '../../utils/helpers';

export function DeviceTrustManagement() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await securityPhase2Api.getDevices();
      setDevices(data.data || []);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleApprove = async (id) => {
    try {
      await securityPhase2Api.approveDevice(id);
      load();
    } catch (err) { alert(err.message); }
  };

  const handleRevoke = async (id) => {
    if (!confirm('Revoke trust for this device?')) return;
    try {
      await securityPhase2Api.revokeDevice(id);
      load();
    } catch (err) { alert(err.message); }
  };

  const getDeviceIcon = (type) => {
    if (type === 'mobile') return <Smartphone className="w-5 h-5" />;
    return <Monitor className="w-5 h-5" />;
  };

  const getTrustBadge = (device) => {
    if (device.is_trusted && device.trusted_until && new Date(device.trusted_until) > new Date()) {
      return <span className="badge badge-success">Trusted</span>;
    }
    if (device.is_approved) return <span className="badge badge-info">Approved</span>;
    return <span className="badge badge-gray">Unknown</span>;
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Device Trust Management</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage trusted devices and login approvals</p>
        </div>
        <button onClick={load} className="btn-secondary gap-2"><RefreshCw className="w-4 h-4" /> Refresh</button>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {error}</div>}

      {devices.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-gray-400">
          <Globe className="w-12 h-12 mb-3" />
          <p className="text-lg">No devices registered</p>
          <p className="text-sm">Devices will appear here after you log in</p>
        </div>
      ) : (
        <div className="space-y-3">
          {devices.map(d => (
            <div key={d.id} className="card">
              <div className="card-body">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                      {getDeviceIcon(d.device_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium truncate">{d.device_name || 'Unknown device'}</p>
                        {getTrustBadge(d)}
                      </div>
                      <div className="text-sm text-gray-500 space-y-0.5">
                        {d.browser && <p>Browser: {d.browser}{d.browser_version ? ` ${d.browser_version}` : ''}</p>}
                        {d.os && <p>OS: {d.os}{d.os_version ? ` ${d.os_version}` : ''}</p>}
                        {d.ip_address && <p className="font-mono">IP: {d.ip_address}</p>}
                        <p>First seen: {formatDateTime(d.first_seen_at)}</p>
                        <p>Last seen: {formatDateTime(d.last_seen_at)} · Logins: {d.login_count}</p>
                        {d.trusted_until && <p>Trusted until: {formatDateTime(d.trusted_until)}</p>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4 flex-shrink-0">
                    {!d.is_trusted && (
                      <button onClick={() => handleApprove(d.id)} className="btn-primary btn-sm gap-1">
                        <CheckCircle className="w-3 h-3" /> Trust
                      </button>
                    )}
                    <button onClick={() => handleRevoke(d.id)} className="btn-danger btn-sm gap-1">
                      <XCircle className="w-3 h-3" /> Revoke
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
