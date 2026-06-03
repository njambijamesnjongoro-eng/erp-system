import React, { useState, useEffect } from 'react';
import { socApi } from '../../api/soc';

export function AlertsCenter() {
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ severity: '', status: '' });

  const fetchAlerts = () => {
    setLoading(true);
    socApi.getAlerts(filter).then(r => setAlerts(r.data.data)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { fetchAlerts(); socApi.getAlertStats().then(r => setStats(r.data.data)).catch(() => {}); }, [filter]);

  const handleResolve = async (id) => {
    const notes = prompt('Resolution notes:');
    if (notes === null) return;
    await socApi.resolveAlert(id, notes);
    fetchAlerts();
  };

  const severityColor = (s) => {
    const map = { critical: 'bg-red-900 text-red-300', high: 'bg-orange-900 text-orange-300', medium: 'bg-yellow-900 text-yellow-300', low: 'bg-blue-900 text-blue-300' };
    return map[s] || 'bg-gray-700';
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Security Alerts Center</h1>

      {stats && (
        <div className="grid grid-cols-5 gap-3 text-center text-sm">
          <div className="bg-gray-800 rounded p-2"><span className="text-red-400 font-bold">{stats.bySeverity?.find(s => s.severity === 'critical')?.count || 0}</span> Critical</div>
          <div className="bg-gray-800 rounded p-2"><span className="text-orange-400 font-bold">{stats.bySeverity?.find(s => s.severity === 'high')?.count || 0}</span> High</div>
          <div className="bg-gray-800 rounded p-2"><span className="text-yellow-400 font-bold">{stats.bySeverity?.find(s => s.severity === 'medium')?.count || 0}</span> Medium</div>
          <div className="bg-gray-800 rounded p-2"><span className="text-blue-400 font-bold">{stats.bySeverity?.find(s => s.severity === 'low')?.count || 0}</span> Low</div>
          <div className="bg-gray-800 rounded p-2"><span className="text-white font-bold">{stats.total}</span> Total</div>
        </div>
      )}

      <div className="bg-gray-800 rounded-lg p-4 flex gap-3">
        <select value={filter.severity} onChange={e => setFilter(p => ({ ...p, severity: e.target.value }))} className="bg-gray-700 px-3 py-1.5 rounded text-sm">
          <option value="">All Severities</option>
          <option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
        </select>
        <select value={filter.status} onChange={e => setFilter(p => ({ ...p, status: e.target.value }))} className="bg-gray-700 px-3 py-1.5 rounded text-sm">
          <option value="">All Statuses</option>
          <option value="open">Open</option><option value="acknowledged">Acknowledged</option><option value="resolved">Resolved</option>
        </select>
      </div>

      {loading ? <div className="text-center py-8 text-gray-400">Loading...</div> : alerts.length === 0 ? <div className="text-center py-8 text-gray-500">No alerts</div> : (
        <div className="space-y-2">
          {alerts.map(a => (
            <div key={a.id} className={`bg-gray-800 rounded-lg p-4 border-l-4 ${a.severity === 'critical' ? 'border-red-500' : a.severity === 'high' ? 'border-orange-500' : a.severity === 'medium' ? 'border-yellow-500' : 'border-blue-500'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex gap-2 items-center">
                    <span className={`px-2 py-0.5 rounded text-xs ${severityColor(a.severity)}`}>{a.severity}</span>
                    <span className="text-xs text-gray-400">{a.alert_type}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${a.status === 'open' ? 'bg-red-900 text-red-300' : a.status === 'acknowledged' ? 'bg-yellow-900 text-yellow-300' : 'bg-green-900 text-green-300'}`}>{a.status}</span>
                  </div>
                  <p className="font-medium mt-1">{a.title}</p>
                  {a.description && <p className="text-sm text-gray-400 mt-1">{a.description}</p>}
                  <div className="flex gap-4 mt-2 text-xs text-gray-500">
                    <span>IP: {a.ip_address || 'N/A'}</span>
                    <span>User: {a.user_id || 'N/A'}</span>
                    <span>Level: {a.escalation_level}</span>
                    <span>{new Date(a.created_at).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {a.status === 'open' && <button onClick={() => socApi.acknowledgeAlert(a.id).then(fetchAlerts)} className="text-xs bg-yellow-700 hover:bg-yellow-600 px-2 py-1 rounded">Ack</button>}
                  {a.status !== 'resolved' && <button onClick={() => handleResolve(a.id)} className="text-xs bg-green-700 hover:bg-green-600 px-2 py-1 rounded">Resolve</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
