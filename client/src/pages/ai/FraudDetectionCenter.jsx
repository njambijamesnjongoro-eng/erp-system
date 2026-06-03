import React, { useState, useEffect } from 'react';
import { aiSecurityApi } from '../../api/aiSecurity';

const fraudTypes = ['ghost_employee', 'payroll_fraud', 'duplicate_payment', 'procurement_fraud', 'vendor_collusion', 'fake_invoice', 'expense_fraud', 'asset_misuse'];

export function FraudDetectionCenter() {
  const [detections, setDetections] = useState([]);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState({ fraudType: '', severity: '' });

  useEffect(() => {
    aiSecurityApi.getFraudDetections({ ...filter, limit: 100 }).then(r => setDetections(r.data.data?.data || [])).catch(() => {});
    aiSecurityApi.getFraudStats().then(r => setStats(r.data.data)).catch(() => {});
  }, [filter]);

  const runDetections = async () => {
    await aiSecurityApi.runGhostEmployeeDetection();
    await aiSecurityApi.runDuplicatePaymentDetection();
    const r = await aiSecurityApi.getFraudDetections({ limit: 100 });
    setDetections(r.data.data?.data || []);
    aiSecurityApi.getFraudStats().then(r => setStats(r.data.data)).catch(() => {});
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Fraud Detection Center</h1>
        <button onClick={runDetections} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm">Run Fraud Scans</button>
      </div>

      {stats && (
        <div className="grid grid-cols-5 gap-3 text-center">
          <div className="bg-gray-800 rounded p-3"><div className="text-2xl font-bold">{stats.total}</div><div className="text-xs text-gray-400">Total</div></div>
          <div className="bg-gray-800 rounded p-3"><div className="text-2xl font-bold text-red-400">{stats.open}</div><div className="text-xs text-gray-400">Open</div></div>
          {stats.byType?.slice(0, 3).map(t => (
            <div key={t.fraud_type} className="bg-gray-800 rounded p-3"><div className="text-lg font-bold">{t.c}</div><div className="text-xs text-gray-400">{t.fraud_type?.replace(/_/g, ' ')}</div></div>
          ))}
        </div>
      )}

      <div className="bg-gray-800 rounded-lg p-4 flex gap-3">
        <select value={filter.fraudType} onChange={e => setFilter(p => ({ ...p, fraudType: e.target.value }))} className="bg-gray-700 px-3 py-1.5 rounded text-sm">
          <option value="">All Types</option>{fraudTypes.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
        </select>
        <select value={filter.severity} onChange={e => setFilter(p => ({ ...p, severity: e.target.value }))} className="bg-gray-700 px-3 py-1.5 rounded text-sm">
          <option value="">All Severities</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option>
        </select>
      </div>

      <div className="bg-gray-800 rounded-lg p-4">
        {detections.length === 0 ? <p className="text-gray-500 text-sm">No fraud detections. Run a scan to begin.</p> : (
          <div className="space-y-2">
            {detections.map(d => (
              <div key={d.id} className={`bg-gray-700 rounded p-3 text-sm border-l-4 ${d.severity === 'critical' ? 'border-red-500' : d.severity === 'high' ? 'border-orange-500' : 'border-yellow-500'}`}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${d.severity === 'critical' ? 'bg-red-900 text-red-300' : d.severity === 'high' ? 'bg-orange-900 text-orange-300' : 'bg-yellow-900 text-yellow-300'}`}>{d.severity}</span>
                    <span className="font-medium">{d.title}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs ${d.status === 'open' ? 'bg-red-900 text-red-300' : d.status === 'investigating' ? 'bg-yellow-900 text-yellow-300' : 'bg-green-900 text-green-300'}`}>{d.status}</span>
                </div>
                {d.description && <p className="text-xs text-gray-400 mt-1">{d.description}</p>}
                <div className="flex gap-3 mt-1 text-xs text-gray-500">
                  <span>Type: {d.fraud_type?.replace(/_/g, ' ')}</span>
                  <span>Score: {d.risk_score}</span>
                  {d.amount > 0 && <span>Amount: ${parseFloat(d.amount).toFixed(2)}</span>}
                  <span>{d.entity_name}</span>
                  <span>{new Date(d.created_at).toLocaleString()}</span>
                </div>
                {d.indicators?.length > 0 && (
                  <div className="flex gap-1 mt-1">{d.indicators.map(i => <span key={i} className="text-xs bg-gray-600 px-1.5 py-0.5 rounded">{i}</span>)}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
