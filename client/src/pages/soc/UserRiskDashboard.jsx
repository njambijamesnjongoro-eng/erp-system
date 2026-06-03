import React, { useState, useEffect } from 'react';
import { socApi } from '../../api/soc';

export function UserRiskDashboard() {
  const [risks, setRisks] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    Promise.all([
      socApi.getAllUserRisks({ riskLevel: filterLevel || undefined }).then(r => setRisks(r.data.data)).catch(() => {}),
      socApi.getRiskOverview().then(r => setOverview(r.data.data)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [filterLevel]);

  const handleUserSelect = async (userId) => {
    setSelectedUser(userId);
    socApi.getUserRiskHistory(userId).then(r => setHistory(r.data.data)).catch(() => {});
  };

  const handleRecalculate = async (userId) => {
    await socApi.calculateUserRisk(userId);
    socApi.getAllUserRisks({ riskLevel: filterLevel || undefined }).then(r => setRisks(r.data.data)).catch(() => {});
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">User Risk Dashboard</h1>

      {overview && (
        <div className="grid grid-cols-5 gap-3">
          <div className="bg-gray-800 rounded p-3 text-center"><div className="text-xl font-bold">{overview.avgRisk}</div><div className="text-xs text-gray-400">Avg Risk</div></div>
          {['low', 'medium', 'high', 'critical'].map(level => (
            <div key={level} className="bg-gray-800 rounded p-3 text-center">
              <div className={`text-xl font-bold ${level === 'critical' ? 'text-red-400' : level === 'high' ? 'text-orange-400' : level === 'medium' ? 'text-yellow-400' : 'text-green-400'}`}>
                {overview.distribution?.find(d => d.risk_level === level)?.count || 0}
              </div>
              <div className="text-xs text-gray-400 capitalize">{level}</div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-gray-800 rounded-lg p-4 flex gap-3">
        <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)} className="bg-gray-700 px-3 py-1.5 rounded text-sm">
          <option value="">All Risk Levels</option>
          <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">User Risk Rankings</h2>
          {loading ? <p className="text-gray-500">Loading...</p> : risks.length === 0 ? <p className="text-gray-500 text-sm">No data</p> : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {risks.map(r => (
                <div key={`${r.user_id}-${r.id}`} onClick={() => handleUserSelect(r.user_id)} className={`bg-gray-700 rounded p-3 text-sm cursor-pointer hover:bg-gray-600 ${selectedUser === r.user_id ? 'ring-1 ring-blue-500' : ''}`}>
                  <div className="flex justify-between items-center">
                    <div><span className="font-medium">{r.full_name || r.email}</span><span className="text-xs text-gray-400 ml-2">{r.role_name}</span></div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${r.risk_level === 'critical' ? 'bg-red-900 text-red-300' : r.risk_level === 'high' ? 'bg-orange-900 text-orange-300' : r.risk_level === 'medium' ? 'bg-yellow-900 text-yellow-300' : 'bg-green-900 text-green-300'}`}>{r.risk_level}</span>
                      <span className="text-xs text-gray-400">{(r.overall_score * 100).toFixed(0)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-1 text-xs text-gray-400">
                    <span>Login: {(r.login_risk * 100).toFixed(0)}</span>
                    <span>Device: {(r.device_risk * 100).toFixed(0)}</span>
                    <span>Location: {(r.location_risk * 100).toFixed(0)}</span>
                    <span>Download: {(r.download_risk * 100).toFixed(0)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold">Risk History</h2>
            {selectedUser && <button onClick={() => handleRecalculate(selectedUser)} className="text-xs bg-blue-700 hover:bg-blue-600 px-2 py-1 rounded">Recalculate</button>}
          </div>
          {!selectedUser ? <p className="text-gray-500 text-sm">Select a user to view risk history</p> : history.length === 0 ? <p className="text-gray-500 text-sm">No history</p> : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {history.map(h => (
                <div key={h.id} className="bg-gray-700 rounded p-2 text-xs">
                  <div className="flex justify-between">
                    <span>Score: {(h.overall_score * 100).toFixed(0)}</span>
                    <span className={`px-1.5 py-0.5 rounded ${h.risk_level === 'critical' ? 'bg-red-900 text-red-300' : h.risk_level === 'high' ? 'bg-orange-900 text-orange-300' : 'bg-green-900 text-green-300'}`}>{h.risk_level}</span>
                    <span>{new Date(h.calculated_at).toLocaleString()}</span>
                  </div>
                  <div className="flex gap-2 mt-1 text-gray-500">
                    <span>L:{h.login_risk.toFixed(2)}</span><span>D:{h.device_risk.toFixed(2)}</span><span>Loc:{h.location_risk.toFixed(2)}</span>
                    <span>DL:{h.download_risk.toFixed(2)}</span><span>P:{h.permission_risk.toFixed(2)}</span><span>S:{h.session_risk.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
