import React, { useState, useEffect } from 'react';
import { aiSecurityApi } from '../../api/aiSecurity';

export function UserBehaviorAnalytics() {
  const [profiles, setProfiles] = useState([]);
  const [filter, setFilter] = useState({ riskLevel: '', department: '' });
  const [selected, setSelected] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    aiSecurityApi.getUserBehaviorProfiles({ riskLevel: filter.riskLevel || undefined, department: filter.department || undefined, limit: 100 }).then(r => setProfiles(r.data.data?.data || [])).catch(() => {});
  }, [filter]);

  const handleAnalyze = async (userId) => {
    setAnalyzing(true);
    try {
      await aiSecurityApi.analyzeUserBehavior(userId);
      await aiSecurityApi.calculateUserRisk(userId);
    } catch (e) { /* ignore */ }
    setAnalyzing(false);
    const r = await aiSecurityApi.getUserBehaviorProfiles({ limit: 100 });
    setProfiles(r.data.data?.data || []);
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">User Behavior Analytics</h1>

      <div className="flex gap-3 bg-gray-800 rounded-lg p-4">
        <select value={filter.riskLevel} onChange={e => setFilter(p => ({ ...p, riskLevel: e.target.value }))} className="bg-gray-700 px-3 py-1.5 rounded text-sm">
          <option value="">All Risk Levels</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
        </select>
        <input value={filter.department} onChange={e => setFilter(p => ({ ...p, department: e.target.value }))} placeholder="Department" className="bg-gray-700 px-3 py-1.5 rounded text-sm" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">User Behavior Profiles</h2>
          {profiles.length === 0 ? <p className="text-gray-500 text-sm">No profiles. Analyze a user to create one.</p> : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {profiles.map(p => (
                <div key={p.id} onClick={() => setSelected(p)} className={`bg-gray-700 rounded p-3 text-sm cursor-pointer hover:bg-gray-600 ${selected?.user_id === p.user_id ? 'ring-1 ring-blue-500' : ''}`}>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{p.full_name}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${p.risk_level === 'critical' ? 'bg-red-900 text-red-300' : p.risk_level === 'high' ? 'bg-orange-900 text-orange-300' : p.risk_level === 'medium' ? 'bg-yellow-900 text-yellow-300' : 'bg-green-900 text-green-300'}`}>{p.risk_level}</span>
                  </div>
                  <div className="flex gap-2 mt-1 text-xs text-gray-400">
                    <span>{p.department}</span>
                    <span>{p.role_name}</span>
                    <span>Risk: {p.risk_score}</span>
                    <span>Logins: {p.avg_daily_logins}/d</span>
                    <span>Downloads: {p.avg_daily_downloads}/d</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selected && (
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h2 className="text-lg font-semibold">{selected.full_name}</h2>
                <div className="flex gap-2 text-xs text-gray-400">
                  <span>{selected.department}</span><span>{selected.role_name}</span><span>{selected.email}</span>
                </div>
              </div>
              <button onClick={() => handleAnalyze(selected.user_id)} disabled={analyzing} className="text-xs bg-blue-700 hover:bg-blue-600 disabled:opacity-50 px-2 py-1 rounded">{analyzing ? 'Analyzing...' : 'Analyze & Score'}</button>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-gray-700 rounded p-2 text-center"><div className="text-lg font-bold">{selected.avg_daily_logins || 'N/A'}</div><div className="text-xs text-gray-400">Avg Daily Logins</div></div>
              <div className="bg-gray-700 rounded p-2 text-center"><div className="text-lg font-bold">{selected.avg_daily_downloads || 'N/A'}</div><div className="text-xs text-gray-400">Avg Daily Downloads</div></div>
            </div>

            {selected.baseline_login_hours && (
              <div className="mt-3">
                <h3 className="text-xs font-medium text-gray-400 mb-1">Login Hour Distribution</h3>
                <div className="bg-gray-700 rounded p-2 text-xs max-h-32 overflow-y-auto">
                  {JSON.parse(typeof selected.baseline_login_hours === 'string' ? selected.baseline_login_hours : '[]').map((h, i) => (
                    <div key={i} className="flex justify-between"><span>Hour {h.hour}:00</span><span>{h.c} logins</span></div>
                  ))}
                </div>
              </div>
            )}
            <div className="text-xs text-gray-500 mt-3">Last analyzed: {selected.last_analyzed_at ? new Date(selected.last_analyzed_at).toLocaleString() : 'Never'}</div>
          </div>
        )}
      </div>
    </div>
  );
}
