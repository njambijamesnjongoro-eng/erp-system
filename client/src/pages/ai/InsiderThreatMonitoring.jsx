import React, { useState, useEffect } from 'react';
import { aiSecurityApi } from '../../api/aiSecurity';

const threatTypes = ['excessive_download', 'unauthorized_export', 'sensitive_access', 'privilege_abuse', 'data_theft', 'boundary_violation'];

export function InsiderThreatMonitoring() {
  const [threats, setThreats] = useState([]);
  const [filter, setFilter] = useState({ threatType: '', severity: '' });
  const [running, setRunning] = useState(false);

  useEffect(() => {
    aiSecurityApi.getInsiderThreats({ ...filter, limit: 100 }).then(r => setThreats(r.data.data?.data || [])).catch(() => {});
  }, [filter]);

  const runDetection = async () => {
    setRunning(true);
    await aiSecurityApi.runInsiderThreatDetection();
    const r = await aiSecurityApi.getInsiderThreats({ limit: 100 });
    setThreats(r.data.data?.data || []);
    setRunning(false);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Insider Threat Monitoring</h1>
        <button onClick={runDetection} disabled={running} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded text-sm">
          {running ? 'Scanning...' : 'Scan for Threats'}
        </button>
      </div>

      <div className="bg-gray-800 rounded-lg p-4 flex gap-3">
        <select value={filter.threatType} onChange={e => setFilter(p => ({ ...p, threatType: e.target.value }))} className="bg-gray-700 px-3 py-1.5 rounded text-sm">
          <option value="">All Types</option>{threatTypes.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
        </select>
        <select value={filter.severity} onChange={e => setFilter(p => ({ ...p, severity: e.target.value }))} className="bg-gray-700 px-3 py-1.5 rounded text-sm">
          <option value="">All Severities</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option>
        </select>
      </div>

      <div className="bg-gray-800 rounded-lg p-4">
        {threats.length === 0 ? <p className="text-gray-500 text-sm">No insider threats detected</p> : (
          <div className="space-y-2">
            {threats.map(t => (
              <div key={t.id} className={`bg-gray-700 rounded p-3 text-sm border-l-4 ${t.severity === 'critical' ? 'border-red-500' : t.severity === 'high' ? 'border-orange-500' : 'border-yellow-500'}`}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${t.severity === 'critical' ? 'bg-red-900 text-red-300' : t.severity === 'high' ? 'bg-orange-900 text-orange-300' : 'bg-yellow-900 text-yellow-300'}`}>{t.severity}</span>
                    <span className="font-medium">{t.title}</span>
                    <span className="text-xs text-gray-400">— {t.user_name}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs ${t.status === 'open' ? 'bg-red-900 text-red-300' : t.status === 'investigating' ? 'bg-yellow-900 text-yellow-300' : t.status === 'mitigated' ? 'bg-green-900 text-green-300' : 'bg-gray-600'}`}>{t.status}</span>
                </div>
                {t.description && <p className="text-xs text-gray-400 mt-1">{t.description}</p>}
                <div className="flex gap-3 mt-1 text-xs text-gray-500">
                  <span>Type: {t.threat_type?.replace(/_/g, ' ')}</span>
                  <span>Risk Score: {t.risk_score}</span>
                  <span>Dept: {t.department}</span>
                  <span>Role: {t.role_name}</span>
                  <span>Activities: {t.activity_count}</span>
                  <span>Window: {t.time_window_hours}h</span>
                </div>
                {t.indicators?.length > 0 && (
                  <div className="flex gap-1 mt-1">{t.indicators.map(i => <span key={i} className="text-xs bg-gray-600 px-1.5 py-0.5 rounded">{i}</span>)}</div>
                )}
                <div className="flex gap-2 mt-2">
                  <button className="text-xs bg-yellow-700 hover:bg-yellow-600 px-2 py-1 rounded">Investigate</button>
                  <button className="text-xs bg-green-700 hover:bg-green-600 px-2 py-1 rounded">Mark Mitigated</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
