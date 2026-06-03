import React, { useState, useEffect } from 'react';
import { phase9Api } from '../../api/phase9';

export function SecurityCommandCenter() {
  const [data, setData] = useState(null);

  useEffect(() => { phase9Api.getCommandCenter().then(r => setData(r.data.data)).catch(() => {}); }, []);

  if (!data) return <div className="p-6 text-gray-400">Loading Security Command Center...</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Security Command Center</h1>
      <div className="bg-gradient-to-r from-indigo-900 to-purple-900 rounded-lg p-6 text-center">
        <div className="text-5xl font-bold text-white">{data.overallSecurityScore || 0}</div>
        <div className="text-sm text-indigo-300 mt-1">Overall Security Maturity</div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 text-center"><div className="text-2xl font-bold text-green-400">{data.avgTrustScore || 0}</div><div className="text-xs text-gray-400">Trust Score</div></div>
        <div className="bg-gray-800 rounded-lg p-4 text-center"><div className="text-2xl font-bold text-orange-400">{data.activePams || 0}</div><div className="text-xs text-gray-400">Active PAM Sessions</div></div>
        <div className="bg-gray-800 rounded-lg p-4 text-center"><div className="text-2xl font-bold text-red-400">{data.openDlps || 0}</div><div className="text-xs text-gray-400">Open DLP Alerts</div></div>
        <div className="bg-gray-800 rounded-lg p-4 text-center"><div className="text-2xl font-bold text-yellow-400">{data.newSiemEvents || 0}</div><div className="text-xs text-gray-400">New SIEM Events</div></div>
        <div className="bg-gray-800 rounded-lg p-4 text-center"><div className="text-2xl font-bold text-cyan-400">{data.openInsiderThreats || 0}</div><div className="text-xs text-gray-400">Insider Threats</div></div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 text-center"><div className="text-2xl font-bold text-blue-400">{data.activeHunts || 0}</div><div className="text-xs text-gray-400">Active Hunts</div></div>
        <div className="bg-gray-800 rounded-lg p-4 text-center"><div className="text-2xl font-bold text-purple-400">{data.vaultItems || 0}</div><div className="text-xs text-gray-400">Vault Items</div></div>
        <div className="bg-gray-800 rounded-lg p-4 text-center"><div className="text-2xl font-bold text-green-400">{data.activeResiliencePlans || 0}</div><div className="text-xs text-gray-400">Resilience Plans</div></div>
        <div className="bg-gray-800 rounded-lg p-4 text-center"><div className="text-2xl font-bold text-pink-400">{data.protectedExecutives || 0}</div><div className="text-xs text-gray-400">Executives Protected</div></div>
        <div className="bg-gray-800 rounded-lg p-4 text-center"><div className="text-2xl font-bold text-indigo-400">{data.runningSoar || 0}</div><div className="text-xs text-gray-400">SOAR Running</div></div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Recent SIEM Events</h2>
          {data.recentSiemEvents?.map(e => (
            <div key={e.id} className="flex justify-between py-2 border-b border-gray-700 text-sm">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${e.severity === 'critical' ? 'bg-red-900 text-red-300' : e.severity === 'high' ? 'bg-orange-900 text-orange-300' : 'bg-yellow-900 text-yellow-300'}`}>{e.severity}</span>
              <span className="flex-1 ml-2">{e.title}</span>
              <span className="text-gray-500 text-xs">{e.event_source}</span>
            </div>
          ))}
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Security Scores</h2>
          {data.securityScores?.slice(0, 6).map(s => (
            <div key={s.id} className="flex justify-between items-center py-2 border-b border-gray-700">
              <span className="text-sm">{s.score_name}</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-blue-400">{s.score_value}</span>
                <span className={`text-xs ${s.trend === 'improving' ? 'text-green-400' : s.trend === 'declining' ? 'text-red-400' : 'text-yellow-400'}`}>{s.trend}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
