import React, { useState, useEffect } from 'react';
import { phase9Api } from '../../api/phase9';

export function SIEMDashboard() {
  const [events, setEvents] = useState({ rows: [], total: 0 });
  const [correlations, setCorrelations] = useState({ rows: [], total: 0 });
  const [stats, setStats] = useState(null);
  const [tab, setTab] = useState('events');

  const load = () => {
    phase9Api.getSiemEvents({ limit: 100 }).then(r => setEvents(r.data.data)).catch(() => {});
    phase9Api.getSiemStats().then(r => setStats(r.data.data)).catch(() => {});
    phase9Api.getSiemCorrelations({ limit: 50 }).then(r => setCorrelations(r.data.data)).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Security Information & Event Management</h1>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.bySeverity?.map(s => (
            <div key={s.severity} className="bg-gray-800 rounded-lg p-4 text-center">
              <div className={`text-2xl font-bold ${s.severity === 'critical' ? 'text-red-400' : s.severity === 'high' ? 'text-orange-400' : s.severity === 'medium' ? 'text-yellow-400' : 'text-blue-400'}`}>{s.count}</div>
              <div className="text-xs text-gray-400 capitalize">{s.severity}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 items-center">
        {['events', 'correlations', 'sources'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded text-sm ${tab === t ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>{t.toUpperCase()}</button>
        ))}
        <div className="flex-1" />
        <button onClick={() => phase9Api.correlateSiem().then(load)} className="bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded text-xs">Run Correlation</button>
      </div>

      {tab === 'events' && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Events ({events.total})</h2>
          {events.rows.map(e => (
            <div key={e.id} className="flex justify-between items-center p-2 bg-gray-750 rounded border border-gray-700 mb-1 text-xs">
              <div className="flex gap-2 items-center flex-1">
                <span className={`px-1.5 py-0.5 rounded font-medium ${e.severity === 'critical' ? 'bg-red-900 text-red-300' : e.severity === 'high' ? 'bg-orange-900 text-orange-300' : 'bg-yellow-900 text-yellow-300'}`}>{e.severity}</span>
                <span className="font-medium">{e.title}</span>
                <span className="text-gray-500">{e.event_source}</span>
                <span className="text-gray-500">{e.event_type}</span>
              </div>
              <div className="flex gap-2 items-center">
                <span className="text-gray-500">{e.user_name || '-'}</span>
                <span className={`${e.status === 'new' ? 'text-yellow-400' : 'text-gray-500'}`}>{e.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'correlations' && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Correlations ({correlations.total})</h2>
          {correlations.rows.map(c => (
            <div key={c.id} className="p-3 bg-gray-750 rounded border border-gray-700 mb-2">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-sm font-medium">{c.correlation_name}</span>
                  <span className="text-xs text-gray-500 ml-2">{c.correlation_type}</span>
                  <div className="text-xs text-gray-500 mt-1">{c.related_events} events • Threat: {c.threat_score}</div>
                  {c.description && <div className="text-xs text-gray-400 mt-1">{c.description}</div>}
                </div>
                <span className={`text-xs ${c.status === 'new' ? 'text-yellow-400' : 'text-green-400'}`}>{c.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'sources' && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3">By Source</h2>
            {stats.bySource?.map(s => (
              <div key={s.event_source} className="flex justify-between py-1 text-sm"><span>{s.event_source}</span><span className="text-gray-400">{s.count}</span></div>
            ))}
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3">By Category</h2>
            {stats.byCategory?.map(c => (
              <div key={c.event_category} className="flex justify-between py-1 text-sm"><span className="capitalize">{c.event_category}</span><span className="text-gray-400">{c.count}</span></div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
