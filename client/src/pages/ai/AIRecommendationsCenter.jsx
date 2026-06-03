import React, { useState, useEffect } from 'react';
import { aiSecurityApi } from '../../api/aiSecurity';

const recTypes = ['enable_mfa', 'restrict_permissions', 'review_activity', 'lock_account', 'increase_approval', 'security_training', 'policy_update'];

export function AIRecommendationsCenter() {
  const [recommendations, setRecommendations] = useState([]);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState({ recommendationType: '', priority: '' });

  useEffect(() => {
    aiSecurityApi.getRecommendations({ ...filter, limit: 100 }).then(r => setRecommendations(r.data.data?.data || [])).catch(() => {});
    aiSecurityApi.getRecommendationStats().then(r => setStats(r.data.data)).catch(() => {});
  }, [filter]);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">AI Security Recommendations</h1>

      {stats && (
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-gray-800 rounded p-3 text-center"><div className="text-2xl font-bold">{stats.total}</div><div className="text-xs text-gray-400">Total</div></div>
          <div className="bg-gray-800 rounded p-3 text-center"><div className="text-2xl font-bold text-yellow-400">{stats.pending}</div><div className="text-xs text-gray-400">Pending</div></div>
          {stats.byPriority?.slice(0, 2).map(p => (
            <div key={p.priority} className="bg-gray-800 rounded p-3 text-center"><div className="text-lg font-bold">{p.c}</div><div className="text-xs text-gray-400 capitalize">{p.priority}</div></div>
          ))}
        </div>
      )}

      <div className="bg-gray-800 rounded-lg p-4 flex gap-3">
        <select value={filter.recommendationType} onChange={e => setFilter(p => ({ ...p, recommendationType: e.target.value }))} className="bg-gray-700 px-3 py-1.5 rounded text-sm">
          <option value="">All Types</option>{recTypes.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
        </select>
        <select value={filter.priority} onChange={e => setFilter(p => ({ ...p, priority: e.target.value }))} className="bg-gray-700 px-3 py-1.5 rounded text-sm">
          <option value="">All Priorities</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
        </select>
      </div>

      <div className="bg-gray-800 rounded-lg p-4">
        {recommendations.length === 0 ? <p className="text-gray-500 text-sm">No recommendations</p> : (
          <div className="space-y-2">
            {recommendations.map(r => (
              <div key={r.id} className={`bg-gray-700 rounded p-3 text-sm border-l-4 ${r.priority === 'critical' ? 'border-red-500' : r.priority === 'high' ? 'border-orange-500' : r.priority === 'medium' ? 'border-yellow-500' : 'border-blue-500'}`}>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${r.priority === 'critical' ? 'bg-red-900 text-red-300' : r.priority === 'high' ? 'bg-orange-900 text-orange-300' : r.priority === 'medium' ? 'bg-yellow-900 text-yellow-300' : 'bg-blue-900 text-blue-300'}`}>{r.priority}</span>
                    <span className="font-medium">{r.title}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs ${r.status === 'open' ? 'bg-red-900 text-red-300' : r.status === 'in_progress' ? 'bg-yellow-900 text-yellow-300' : r.status === 'implemented' ? 'bg-green-900 text-green-300' : 'bg-gray-600'}`}>{r.status}</span>
                </div>
                {r.description && <p className="text-xs text-gray-400 mt-1">{r.description}</p>}
                <div className="flex gap-2 mt-1 text-xs text-gray-500">
                  <span>Type: {r.recommendation_type?.replace(/_/g, ' ')}</span>
                  <span>Category: {r.category}</span>
                  <span>Effort: {r.effort}</span>
                  <span>Risk: {r.risk_score}</span>
                  {r.target_entity_name && <span>Target: {r.target_entity_name}</span>}
                </div>
                {r.implementation_steps?.length > 0 && (
                  <div className="mt-1">
                    <span className="text-xs text-gray-400">Steps:</span>
                    <ul className="text-xs text-gray-500 ml-4 list-disc">
                      {r.implementation_steps.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                )}
                <div className="text-xs text-gray-500 mt-1">{new Date(r.created_at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
