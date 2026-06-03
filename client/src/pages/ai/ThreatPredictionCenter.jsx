import React, { useState, useEffect } from 'react';
import { aiSecurityApi } from '../../api/aiSecurity';

export function ThreatPredictionCenter() {
  const [predictions, setPredictions] = useState([]);
  const [filter, setFilter] = useState({ predictionType: '', status: '' });

  useEffect(() => {
    aiSecurityApi.getPredictions({ ...filter, limit: 100 }).then(r => setPredictions(r.data.data?.data || [])).catch(() => {});
  }, [filter]);

  const runPredictions = async () => {
    await aiSecurityApi.runPredictions();
    const r = await aiSecurityApi.getPredictions({ limit: 100 });
    setPredictions(r.data.data?.data || []);
  };

  const types = ['security_incident', 'fraud_attempt', 'compliance_failure', 'asset_failure', 'insider_threat'];

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Threat Prediction Center</h1>
        <button onClick={runPredictions} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm">Generate Predictions</button>
      </div>

      <div className="bg-gray-800 rounded-lg p-4 flex gap-3">
        <select value={filter.predictionType} onChange={e => setFilter(p => ({ ...p, predictionType: e.target.value }))} className="bg-gray-700 px-3 py-1.5 rounded text-sm">
          <option value="">All Types</option>{types.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
        </select>
        <select value={filter.status} onChange={e => setFilter(p => ({ ...p, status: e.target.value }))} className="bg-gray-700 px-3 py-1.5 rounded text-sm">
          <option value="">All Statuses</option><option value="active">Active</option><option value="realized">Realized</option><option value="false_prediction">False</option><option value="expired">Expired</option>
        </select>
      </div>

      <div className="bg-gray-800 rounded-lg p-4">
        {predictions.length === 0 ? <p className="text-gray-500 text-sm">No predictions. Generate to begin forecasting.</p> : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {predictions.map(p => (
              <div key={p.id} className={`bg-gray-700 rounded p-4 text-sm ${p.probability >= 70 ? 'border-l-4 border-red-500' : p.probability >= 50 ? 'border-l-4 border-orange-500' : 'border-l-4 border-yellow-500'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{p.title}</h3>
                    <span className="text-xs text-gray-400">{p.prediction_type?.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${p.probability >= 70 ? 'text-red-400' : p.probability >= 50 ? 'text-orange-400' : 'text-yellow-400'}`}>{p.probability}%</div>
                    <div className="text-xs text-gray-400">probability</div>
                  </div>
                </div>
                {p.description && <p className="text-xs text-gray-400 mt-2">{p.description}</p>}
                <div className="flex gap-2 mt-2 text-xs text-gray-500">
                  <span>Timeframe: {p.timeframe}</span>
                  <span>Status: {p.status}</span>
                  {p.predicted_entity_name && <span>Target: {p.predicted_entity_name}</span>}
                </div>
                {p.recommendation && <div className="mt-2 text-xs bg-blue-900/30 rounded p-2 text-blue-300">{p.recommendation}</div>}
                <div className="text-xs text-gray-500 mt-2">{new Date(p.created_at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
