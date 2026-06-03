import React, { useState, useEffect } from 'react';
import { aiSecurityApi } from '../../api/aiSecurity';

export function AISecurityCenter() {
  const [data, setData] = useState(null);

  useEffect(() => { aiSecurityApi.getDashboard().then(r => setData(r.data.data)).catch(() => {}); }, []);

  if (!data) return <div className="p-6 text-gray-400">Loading AI Security Center...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">AI Security Operations Center</h1>
        <div className="flex gap-2">
          <button onClick={() => aiSecurityApi.runAllDetections().then(() => aiSecurityApi.getDashboard().then(r => setData(r.data.data)))} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm">Run All Detections</button>
          <button onClick={() => aiSecurityApi.calculateHeatmaps().then(() => aiSecurityApi.getDashboard().then(r => setData(r.data.data)))} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-sm">Update Heatmaps</button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-red-400">{data.fraud?.open || 0}</div>
          <div className="text-sm text-gray-400">Open Fraud</div>
          <div className="text-xs text-gray-500">{data.fraud?.total} total</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-orange-400">{data.anomalies?.open || 0}</div>
          <div className="text-sm text-gray-400">Open Anomalies</div>
          <div className="text-xs text-gray-500">{data.anomalies?.total} total</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-yellow-400">{data.predictions?.active || 0}</div>
          <div className="text-sm text-gray-400">Active Predictions</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-purple-400">{data.insiderThreats?.active || 0}</div>
          <div className="text-sm text-gray-400">Insider Threats</div>
          <div className="text-xs text-gray-500">{data.recommendations?.pending || 0} recs pending</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-blue-400">{data.highRiskUsers || 0}</div>
          <div className="text-sm text-gray-400">High-Risk Users</div>
          <div className="text-xs text-gray-500">{data.correlations || 0} correlations</div>
        </div>
      </div>

      {/* Recent Activity + Predictions + Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Recent Fraud Detections</h2>
          {data.recentDetections?.length > 0 ? (
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {data.recentDetections.map(d => (
                <div key={d.id} className="flex justify-between text-sm py-1 border-b border-gray-700 last:border-0">
                  <div><span className={`text-xs px-1.5 py-0.5 rounded ${d.severity === 'critical' ? 'bg-red-900 text-red-300' : d.severity === 'high' ? 'bg-orange-900 text-orange-300' : 'bg-yellow-900 text-yellow-300'}`}>{d.severity}</span>
                    <span className="ml-1">{d.fraud_type?.replace(/_/g, ' ')}</span></div>
                  <span className="text-xs text-gray-500">{new Date(d.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-gray-500 text-sm">No recent detections</p>}
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Active Predictions</h2>
          {data.recentPredictions?.length > 0 ? (
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {data.recentPredictions.map(p => (
                <div key={p.id} className="text-sm py-1 border-b border-gray-700 last:border-0">
                  <div className="flex justify-between"><span className="font-medium">{p.title}</span><span className="text-xs text-gray-400">{p.probability}%</span></div>
                  <div className="text-xs text-gray-500">{p.prediction_type?.replace(/_/g, ' ')} · {p.timeframe}</div>
                </div>
              ))}
            </div>
          ) : <p className="text-gray-500 text-sm">No active predictions</p>}
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">AI Recommendations</h2>
          {data.topRecommendations?.length > 0 ? (
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {data.topRecommendations.map(r => (
                <div key={r.id} className="text-sm py-1 border-b border-gray-700 last:border-0">
                  <div className="flex justify-between">
                    <span className="font-medium">{r.title}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${r.priority === 'critical' ? 'bg-red-900 text-red-300' : r.priority === 'high' ? 'bg-orange-900 text-orange-300' : 'bg-yellow-900 text-yellow-300'}`}>{r.priority}</span>
                  </div>
                  <div className="text-xs text-gray-500">{r.category} · {r.recommendation_type?.replace(/_/g, ' ')}</div>
                </div>
              ))}
            </div>
          ) : <p className="text-gray-500 text-sm">No recommendations</p>}
        </div>
      </div>

      {/* Recent Anomalies + Insider Threats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Recent Anomalies</h2>
          {data.recentAnomalies?.length > 0 ? (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {data.recentAnomalies.map(a => (
                <div key={a.id} className="flex justify-between text-sm py-1 border-b border-gray-700 last:border-0">
                  <div>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${a.severity === 'critical' ? 'bg-red-900 text-red-300' : a.severity === 'high' ? 'bg-orange-900 text-orange-300' : 'bg-yellow-900 text-yellow-300'}`}>{a.severity}</span>
                    <span className="ml-1">{a.title}</span>
                  </div>
                  <span className="text-xs text-gray-500">{a.deviation_percentage ? `${a.deviation_percentage.toFixed(0)}%` : ''}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-gray-500 text-sm">No recent anomalies</p>}
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Active Insider Threats</h2>
          {data.recentThreats?.length > 0 ? (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {data.recentThreats.map(t => (
                <div key={t.id} className="flex justify-between text-sm py-1 border-b border-gray-700 last:border-0">
                  <div><span className={`text-xs px-1.5 py-0.5 rounded ${t.severity === 'critical' ? 'bg-red-900 text-red-300' : t.severity === 'high' ? 'bg-orange-900 text-orange-300' : 'bg-yellow-900 text-yellow-300'}`}>{t.severity}</span>
                    <span className="ml-1">{t.user_name} — {t.threat_type?.replace(/_/g, ' ')}</span></div>
                  <span className="text-xs text-gray-500">{t.activity_count} activities</span>
                </div>
              ))}
            </div>
          ) : <p className="text-gray-500 text-sm">No active insider threats</p>}
        </div>
      </div>

      {/* Risk Overview */}
      {data.riskOverview?.userDistribution?.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">User Risk Distribution</h2>
          <div className="grid grid-cols-4 gap-3">
            {data.riskOverview.userDistribution.map(d => (
              <div key={d.risk_level} className={`rounded p-3 text-center ${d.risk_level === 'critical' ? 'bg-red-900/30 border border-red-500' : d.risk_level === 'high' ? 'bg-orange-900/30 border border-orange-500' : d.risk_level === 'medium' ? 'bg-yellow-900/30 border border-yellow-500' : 'bg-green-900/30 border border-green-500'}`}>
                <div className="text-2xl font-bold">{d.c}</div>
                <div className="text-xs capitalize">{d.risk_level}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
