import React, { useState, useEffect } from 'react';
import { socApi } from '../../api/soc';

export function ThreatAnalytics() {
  const [threats, setThreats] = useState([]);
  const [threatStats, setThreatStats] = useState(null);
  const [attacks, setAttacks] = useState([]);
  const [attackStats, setAttackStats] = useState(null);
  const [correlations, setCorrelations] = useState([]);
  const [tab, setTab] = useState('threats');

  useEffect(() => {
    socApi.getThreatRecords({ limit: 50 }).then(r => setThreats(r.data.data)).catch(() => {});
    socApi.getThreatStats().then(r => setThreatStats(r.data.data)).catch(() => {});
    socApi.getAttackEvents({ limit: 50 }).then(r => setAttacks(r.data.data)).catch(() => {});
    socApi.getAttackStats().then(r => setAttackStats(r.data.data)).catch(() => {});
    socApi.getCorrelations({ limit: 20 }).then(r => setCorrelations(r.data.data)).catch(() => {});
  }, []);

  const tabs = ['threats', 'attacks', 'correlations'];

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Threat Analytics</h1>

      <div className="flex gap-1 bg-gray-800 rounded-lg p-1 w-fit">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-md text-sm capitalize ${tab === t ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>{t}</button>
        ))}
      </div>

      {tab === 'threats' && (
        <>
          {threatStats && (
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-gray-800 rounded p-3 text-center"><div className="text-xl font-bold">{threatStats.total}</div><div className="text-xs text-gray-400">Total</div></div>
              <div className="bg-gray-800 rounded p-3 text-center"><div className="text-xl font-bold text-red-400">{threatStats.bySeverity?.find(s => s.severity === 'critical')?.count || 0}</div><div className="text-xs text-gray-400">Critical</div></div>
              <div className="bg-gray-800 rounded p-3 text-center"><div className="text-xl font-bold text-orange-400">{threatStats.bySeverity?.find(s => s.severity === 'high')?.count || 0}</div><div className="text-xs text-gray-400">High</div></div>
              <div className="bg-gray-800 rounded p-3 text-center"><div className="text-xl font-bold text-yellow-400">{threatStats.bySeverity?.find(s => s.severity === 'medium')?.count || 0}</div><div className="text-xs text-gray-400">Medium</div></div>
            </div>
          )}
          <div className="bg-gray-800 rounded-lg p-4">
            {threats.length === 0 ? <p className="text-gray-500 text-sm">No threat records</p> : (
              <div className="space-y-2">{[...threats].slice(0, 50).map(t => (
                <div key={t.id} className="border-l-4 border-red-500 bg-gray-700/50 rounded p-3 text-sm">
                  <div className="flex justify-between"><span className="font-medium">{t.title}</span><span className={`px-2 py-0.5 rounded text-xs bg-red-900 text-red-300`}>{t.severity}</span></div>
                  <p className="text-xs text-gray-400 mt-1">{t.threat_type} · {t.detection_method || 'automated'} · {t.source_ip || ''}</p>
                  <p className="text-xs text-gray-500 mt-1">{new Date(t.created_at).toLocaleString()}</p>
                </div>
              ))}</div>
            )}
          </div>
        </>
      )}

      {tab === 'attacks' && (
        <>
          {attackStats && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-800 rounded p-3 text-center"><div className="text-xl font-bold">{attackStats.total}</div><div className="text-xs text-gray-400">Total Events</div></div>
              <div className="bg-gray-800 rounded p-3 text-center">
                <div className="text-lg font-bold text-orange-400">{attackStats.byType?.slice(0, 3).map(t => t.attack_type).join(', ') || 'N/A'}</div>
                <div className="text-xs text-gray-400">Top Types</div>
              </div>
              <div className="bg-gray-800 rounded p-3 text-center">
                <div className="text-lg font-bold text-red-400">{attackStats.bySeverity?.find(s => s.severity === 'critical')?.count || 0}</div>
                <div className="text-xs text-gray-400">Critical</div>
              </div>
            </div>
          )}
          <div className="bg-gray-800 rounded-lg p-4">
            {attacks.length === 0 ? <p className="text-gray-500">No attack events</p> : (
              <div className="space-y-2">
                {attacks.map(a => (
                  <div key={a.id} className="flex justify-between items-center bg-gray-700/50 rounded p-2 text-sm">
                    <div><span className="font-medium">{a.attack_type}</span><span className={`ml-2 px-2 py-0.5 rounded text-xs bg-red-900 text-red-300`}>{a.severity}</span>
                      <span className="ml-2 text-xs text-gray-400">{a.source_ip} → {a.target_endpoint || 'N/A'}</span></div>
                    <span className="text-xs text-gray-500">{a.is_blocked ? '🛡️ Blocked' : '⚠️ Unblocked'} · {new Date(a.created_at).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'correlations' && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Event Correlations</h2>
          {correlations.length === 0 ? <p className="text-gray-500 text-sm">No correlated events</p> : (
            <div className="space-y-2">
              {correlations.map(c => (
                <div key={c.id} className="border-l-4 border-purple-500 bg-gray-700/50 rounded p-3 text-sm">
                  <div className="flex justify-between"><span className="font-medium">{c.title}</span><span className={`px-2 py-0.5 rounded text-xs ${c.severity === 'critical' ? 'bg-red-900 text-red-300' : 'bg-orange-900 text-orange-300'}`}>{c.severity}</span></div>
                  <p className="text-xs text-gray-400 mt-1">{c.description}</p>
                  <div className="flex gap-2 mt-1 text-xs text-gray-500">
                    <span>Type: {c.correlation_type}</span>
                    <span>Chain: {(c.threat_chain || []).join(' → ')}</span>
                    <span>{new Date(c.created_at).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
