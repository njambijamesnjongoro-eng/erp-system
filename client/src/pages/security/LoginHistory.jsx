import { useState, useEffect } from 'react';
import { Globe, MapPin, Shield, AlertTriangle, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { securityPhase2Api } from '../../api/securityPhase2';
import { formatDateTime } from '../../utils/helpers';

export function LoginHistory() {
  const [history, setHistory] = useState([]);
  const [geoStats, setGeoStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('history');
  const [expanded, setExpanded] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [hRes, gRes] = await Promise.all([
        securityPhase2Api.getLoginHistory(100),
        securityPhase2Api.getGeoStats(),
      ]);
      setHistory(hRes.data?.data || []);
      setGeoStats(gRes.data?.data || []);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const getRiskLevelBadge = (level) => {
    const map = { low: 'badge-success', medium: 'badge-warning', high: 'badge-orange', critical: 'badge-red' };
    return <span className={`badge ${map[level] || 'badge-gray'}`}>{level || 'unknown'}</span>;
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Login History</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Review your account login activity</p>
        </div>
        <button onClick={load} className="btn-secondary gap-2"><RefreshCw className="w-4 h-4" /> Refresh</button>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {error}</div>}

      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit">
        <button onClick={() => setTab('history')} className={`px-4 py-2 text-sm font-medium rounded-md ${tab === 'history' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          <Globe className="w-4 h-4 inline mr-1" /> Login History
        </button>
        <button onClick={() => setTab('locations')} className={`px-4 py-2 text-sm font-medium rounded-md ${tab === 'locations' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          <MapPin className="w-4 h-4 inline mr-1" /> Locations
        </button>
      </div>

      {tab === 'history' && (
        <div className="card">
          <div className="card-body p-0">
            {history.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-gray-400">
                <Globe className="w-8 h-8 mb-2" />
                <p className="text-sm">No login history</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr><th>Date/Time</th><th>Location</th><th>IP Address</th><th>Risk</th><th></th></tr>
                  </thead>
                  <tbody>
                    {history.map((h) => (
                      <>
                        <tr key={h.id} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800" onClick={() => setExpanded(expanded === h.id ? null : h.id)}>
                          <td className="text-sm">{formatDateTime(h.created_at)}</td>
                          <td className="text-sm">{h.city || 'Unknown'}, {h.country || 'Unknown'}</td>
                          <td className="font-mono text-sm">{h.ip_address}</td>
                          <td>{getRiskLevelBadge(h.risk_level)}</td>
                          <td>{expanded === h.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</td>
                        </tr>
                        {expanded === h.id && (
                          <tr key={`${h.id}-details`} className="bg-gray-50 dark:bg-gray-800">
                            <td colSpan={5} className="p-4">
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                                <div><span className="text-gray-500">Country:</span> {h.country} ({h.country_code})</div>
                                <div><span className="text-gray-500">City:</span> {h.city || '-'}</div>
                                <div><span className="text-gray-500">Region:</span> {h.region || '-'}</div>
                                <div><span className="text-gray-500">IP:</span> <code className="font-mono">{h.ip_address}</code></div>
                                <div><span className="text-gray-500">Coordinates:</span> {h.latitude ? `${h.latitude}, ${h.longitude}` : '-'}</div>
                                <div><span className="text-gray-500">Risk Score:</span> {h.risk_score ?? 'N/A'}</div>
                                {h.is_vpn && <div className="text-amber-600 font-medium">VPN/Proxy detected</div>}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'locations' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {geoStats.length === 0 ? (
            <div className="col-span-full flex flex-col items-center py-12 text-gray-400">
              <MapPin className="w-8 h-8 mb-2" />
              <p className="text-sm">No location data</p>
            </div>
          ) : (
            geoStats.map((loc) => (
              <div key={loc.country_code} className="card">
                <div className="card-body">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-medium">{loc.country}</p>
                      <p className="text-xs text-gray-400">{loc.country_code}</p>
                    </div>
                  </div>
                  <div className="text-sm space-y-1">
                    <p className="text-gray-500">{loc.login_count} login{loc.login_count !== 1 ? 's' : ''}</p>
                    <p className="text-xs text-gray-400">First: {formatDateTime(loc.first_login)}</p>
                    <p className="text-xs text-gray-400">Last: {formatDateTime(loc.last_login)}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
