import React, { useState, useEffect } from 'react';
import { phase9Api } from '../../api/phase9';

export function DLPCenter() {
  const [events, setEvents] = useState({ rows: [], total: 0 });
  const [rules, setRules] = useState({ rows: [], total: 0 });
  const [stats, setStats] = useState(null);
  const [tab, setTab] = useState('events');
  const [sensitive, setSensitive] = useState({ rows: [], total: 0 });

  const load = () => {
    phase9Api.getDlpEvents({ limit: 100 }).then(r => setEvents(r.data.data)).catch(() => {});
    phase9Api.getDlpRules({ limit: 100 }).then(r => setRules(r.data.data)).catch(() => {});
    phase9Api.getDlpStats().then(r => setStats(r.data.data)).catch(() => {});
    phase9Api.getSensitiveData({ limit: 100 }).then(r => setSensitive(r.data.data)).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Data Loss Prevention Center</h1>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.bySeverity?.map(s => (
            <div key={s.severity} className="bg-gray-800 rounded-lg p-4 text-center">
              <div className={`text-2xl font-bold ${s.severity === 'critical' ? 'text-red-400' : s.severity === 'high' ? 'text-orange-400' : 'text-yellow-400'}`}>{s.count}</div>
              <div className="text-xs text-gray-400 capitalize">{s.severity}</div>
            </div>
          ))}
          {stats.byAction?.map(a => (
            <div key={a.action_taken} className="bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">{a.count}</div>
              <div className="text-xs text-gray-400 capitalize">{a.action_taken}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 border-b border-gray-700 pb-2">
        {['events', 'rules', 'sensitive'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-t text-sm ${tab === t ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}>{t.toUpperCase()}</button>
        ))}
      </div>

      {tab === 'events' && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">DLP Events ({events.total})</h2>
          {events.rows.map(e => (
            <div key={e.id} className="flex justify-between items-center p-3 bg-gray-750 rounded border border-gray-700 mb-2">
              <div>
                <div className="flex gap-2 items-center">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${e.severity === 'critical' ? 'bg-red-900 text-red-300' : e.severity === 'high' ? 'bg-orange-900 text-orange-300' : 'bg-yellow-900 text-yellow-300'}`}>{e.severity}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${e.action_taken === 'blocked' ? 'bg-red-900 text-red-300' : e.action_taken === 'alerted' ? 'bg-yellow-900 text-yellow-300' : 'bg-green-900 text-green-300'}`}>{e.action_taken}</span>
                  <span className="text-sm font-medium">{e.event_type}</span>
                  <span className="text-xs text-gray-500">{e.user_name}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">{e.data_classification} • {e.source_application} {e.data_details && `• ${e.data_details}`}</div>
              </div>
              <select value={e.status} onChange={e => phase9Api.updateDlpEventStatus(e.event_id, e.target.value).then(load)} className="bg-gray-700 rounded px-2 py-1 text-xs">
                <option value="open">Open</option><option value="investigating">Investigating</option><option value="resolved">Resolved</option><option value="dismissed">Dismissed</option>
              </select>
            </div>
          ))}
        </div>
      )}

      {tab === 'rules' && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">DLP Rules ({rules.total})</h2>
          {rules.rows.map(r => (
            <div key={r.id} className="flex justify-between items-center p-3 bg-gray-750 rounded border border-gray-700 mb-2">
              <div>
                <div className="flex gap-2 items-center">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${r.severity === 'critical' ? 'bg-red-900 text-red-300' : 'bg-yellow-900 text-yellow-300'}`}>{r.severity}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${r.action === 'block' ? 'bg-red-900 text-red-300' : 'bg-blue-900 text-blue-300'}`}>{r.action}</span>
                  <span className="text-sm font-medium">{r.rule_name}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">{r.rule_type} • {r.data_classification} {r.description && `• ${r.description}`}</div>
              </div>
              <span className={`text-xs ${r.enabled ? 'text-green-400' : 'text-red-400'}`}>{r.enabled ? 'Enabled' : 'Disabled'}</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'sensitive' && (
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold">Sensitive Data ({sensitive.total})</h2>
            <button onClick={() => phase9Api.runDiscoveryScan().then(load)} className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-xs">Run Scan</button>
          </div>
          {sensitive.rows.map(s => (
            <div key={s.id} className="flex justify-between items-center p-3 bg-gray-750 rounded border border-gray-700 mb-2">
              <div>
                <div className="flex gap-2 items-center">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.classification === 'critical' ? 'bg-red-900 text-red-300' : s.classification === 'restricted' ? 'bg-orange-900 text-orange-300' : 'bg-yellow-900 text-yellow-300'}`}>{s.classification}</span>
                  <span className="text-sm font-medium">{s.data_type}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">{s.table_name}.{s.column_name} • {s.record_count} records • {s.location}</div>
              </div>
              <span className="text-xs text-gray-400">{s.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
