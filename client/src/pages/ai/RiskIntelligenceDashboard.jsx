import React, { useState, useEffect } from 'react';
import { aiSecurityApi } from '../../api/aiSecurity';

export function RiskIntelligenceDashboard() {
  const [riskScores, setRiskScores] = useState([]);
  const [overview, setOverview] = useState(null);
  const [filter, setFilter] = useState({ scoreType: '', riskLevel: '' });

  useEffect(() => {
    aiSecurityApi.getRiskScores({ scoreType: filter.scoreType || undefined, riskLevel: filter.riskLevel || undefined, limit: 100 }).then(r => setRiskScores(r.data.data?.data || [])).catch(() => {});
    aiSecurityApi.getRiskOverview().then(r => setOverview(r.data.data)).catch(() => {});
  }, [filter]);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Risk Intelligence Dashboard</h1>

      {overview && (
        <div className="grid grid-cols-4 gap-3">
          {overview.averages?.map(a => (
            <div key={a.score_type} className="bg-gray-800 rounded p-3 text-center">
              <div className="text-xl font-bold">{parseFloat(a.avg || 0).toFixed(0)}%</div>
              <div className="text-xs text-gray-400 capitalize">{a.score_type} Avg Risk</div>
            </div>
          ))}
        </div>
      )}

      {overview?.userDistribution?.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">User Risk Distribution</h2>
          <div className="grid grid-cols-4 gap-3">
            {overview.userDistribution.map(d => (
              <div key={d.risk_level} className={`rounded p-3 text-center ${d.risk_level === 'critical' ? 'bg-red-900/30 border border-red-500' : d.risk_level === 'high' ? 'bg-orange-900/30 border border-orange-500' : d.risk_level === 'medium' ? 'bg-yellow-900/30 border border-yellow-500' : 'bg-green-900/30 border border-green-500'}`}>
                <div className="text-2xl font-bold">{d.c}</div>
                <div className="text-xs capitalize">{d.risk_level}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-gray-800 rounded-lg p-4 flex gap-3">
        <select value={filter.scoreType} onChange={e => setFilter(p => ({ ...p, scoreType: e.target.value }))} className="bg-gray-700 px-3 py-1.5 rounded text-sm">
          <option value="">All Types</option><option value="user">User</option><option value="department">Department</option><option value="vendor">Vendor</option><option value="company">Company</option>
        </select>
        <select value={filter.riskLevel} onChange={e => setFilter(p => ({ ...p, riskLevel: e.target.value }))} className="bg-gray-700 px-3 py-1.5 rounded text-sm">
          <option value="">All Levels</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
        </select>
      </div>

      <div className="bg-gray-800 rounded-lg p-4">
        {riskScores.length === 0 ? <p className="text-gray-500 text-sm">No risk scores calculated yet</p> : (
          <div className="space-y-2">
            {riskScores.map(r => (
              <div key={r.id} className="bg-gray-700 rounded p-3 text-sm">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-medium">{r.entity_name || r.entity_id}</span>
                    <span className="ml-2 text-xs text-gray-400">{r.score_type}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${r.risk_level === 'critical' ? 'bg-red-900 text-red-300' : r.risk_level === 'high' ? 'bg-orange-900 text-orange-300' : r.risk_level === 'medium' ? 'bg-yellow-900 text-yellow-300' : 'bg-green-900 text-green-300'}`}>{r.risk_level}</span>
                    <span className="text-lg font-bold">{r.overall_score?.toFixed(0)}</span>
                    {r.trend && <span className={`text-xs ${r.trend === 'increasing' ? 'text-red-400' : r.trend === 'decreasing' ? 'text-green-400' : 'text-gray-400'}`}>{r.trend === 'increasing' ? '↑' : r.trend === 'decreasing' ? '↓' : '→'}</span>}
                  </div>
                </div>
                <div className="flex gap-3 mt-1 text-xs text-gray-400">
                  <span>Login: {r.login_risk?.toFixed(0)}</span>
                  <span>Fraud: {r.fraud_risk?.toFixed(0)}</span>
                  <span>Behavior: {r.behavior_risk?.toFixed(0)}</span>
                  <span>Compliance: {r.compliance_risk?.toFixed(0)}</span>
                  <span>Threat: {r.threat_risk?.toFixed(0)}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">{new Date(r.calculated_at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
