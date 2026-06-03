import React, { useState, useEffect } from 'react';
import { aiSecurityApi } from '../../api/aiSecurity';

export function SecurityHeatmaps() {
  const [heatmaps, setHeatmaps] = useState([]);
  const [type, setType] = useState('user_risk');
  const [calculating, setCalculating] = useState(false);

  useEffect(() => { fetchHeatmaps(); }, [type]);

  const fetchHeatmaps = () => {
    aiSecurityApi.getHeatmaps({ heatmapType: type, limit: 100 }).then(r => setHeatmaps(r.data.data?.data || [])).catch(() => {});
  };

  const handleCalculate = async () => {
    setCalculating(true);
    await aiSecurityApi.calculateHeatmaps();
    fetchHeatmaps();
    setCalculating(false);
  };

  const getBarColor = (score) => {
    if (score >= 75) return 'bg-red-500';
    if (score >= 50) return 'bg-orange-500';
    if (score >= 25) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Security Heatmaps</h1>
        <button onClick={handleCalculate} disabled={calculating} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded text-sm">
          {calculating ? 'Calculating...' : 'Calculate Heatmaps'}
        </button>
      </div>

      <div className="bg-gray-800 rounded-lg p-4 flex gap-3">
        <select value={type} onChange={e => setType(e.target.value)} className="bg-gray-700 px-3 py-1.5 rounded text-sm">
          <option value="user_risk">User Risk</option>
          <option value="department_risk">Department Risk</option>
          <option value="location_threat">Location Threat</option>
          <option value="threat_concentration">Threat Concentration</option>
        </select>
      </div>

      <div className="bg-gray-800 rounded-lg p-4">
        {heatmaps.length === 0 ? <p className="text-gray-500 text-sm">No heatmap data. Calculate to generate.</p> : (
          <div className="space-y-3">
            {heatmaps.map(h => (
              <div key={h.id} className="bg-gray-700 rounded p-3 text-sm">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium">{h.dimension_label}</span>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${h.risk_level === 'critical' ? 'bg-red-900 text-red-300' : h.risk_level === 'high' ? 'bg-orange-900 text-orange-300' : h.risk_level === 'medium' ? 'bg-yellow-900 text-yellow-300' : 'bg-green-900 text-green-300'}`}>{h.risk_level}</span>
                    <span className="text-lg font-bold">{h.risk_score?.toFixed(0)}</span>
                  </div>
                </div>
                <div className="w-full bg-gray-600 rounded-full h-3">
                  <div className={`h-3 rounded-full ${getBarColor(h.risk_score)}`} style={{ width: `${Math.min(h.risk_score, 100)}%` }} />
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>{h.event_count} events</span>
                  <span>{h.severity_distribution ? `Critical: ${h.severity_distribution.critical || 0} High: ${h.severity_distribution.high || 0} Med: ${h.severity_distribution.medium || 0}` : ''}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
