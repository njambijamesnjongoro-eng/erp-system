import React, { useState, useEffect } from 'react';
import { grcApi } from '../../api/grc';

export function SoDControlCenter() {
  const [rules, setRules] = useState([]);
  const [violations, setViolations] = useState([]);
  const [tab, setTab] = useState('rules');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    grcApi.getSodRules({ limit: 100 }).then(r => setRules(r.data.data?.data || [])).catch(() => {});
    grcApi.getSodViolations({ status: filter || undefined, limit: 100 }).then(r => setViolations(r.data.data?.data || [])).catch(() => {});
  }, [filter]);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Segregation of Duties Control Center</h1>

      <div className="flex gap-1 bg-gray-800 rounded-lg p-1 w-fit">
        {['rules', 'violations'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-md text-sm capitalize ${tab === t ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>{t}</button>
        ))}
      </div>

      {tab === 'rules' && (
        <div className="bg-gray-800 rounded-lg p-4">
          {rules.length === 0 ? <p className="text-gray-500 text-sm">No SoD rules configured</p> : (
            <div className="space-y-2">
              {rules.map(r => (
                <div key={r.id} className="bg-gray-700 rounded p-3 text-sm">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">{r.title}</span>
                      <span className="ml-2 text-xs text-gray-400">{r.rule_id}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs ${r.risk_level === 'critical' ? 'bg-red-900 text-red-300' : r.risk_level === 'high' ? 'bg-orange-900 text-orange-300' : 'bg-yellow-900 text-yellow-300'}`}>{r.risk_level}</span>
                  </div>
                  {r.description && <p className="text-xs text-gray-400 mt-1">{r.description}</p>}
                  <div className="flex gap-3 mt-1 text-xs text-gray-500">
                    <span className="font-mono text-red-400">{r.conflicting_permission_a}</span>
                    <span>✗</span>
                    <span className="font-mono text-red-400">{r.conflicting_permission_b}</span>
                    <span>Dept: {r.department}</span>
                    <span className={`${r.is_active ? 'text-green-400' : 'text-red-400'}`}>{r.is_active ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'violations' && (
        <>
          <div className="bg-gray-800 rounded-lg p-4 flex gap-3">
            <select value={filter} onChange={e => setFilter(e.target.value)} className="bg-gray-700 px-3 py-1.5 rounded text-sm">
              <option value="">All Statuses</option><option value="open">Open</option><option value="investigating">Investigating</option><option value="mitigated">Mitigated</option><option value="accepted">Accepted</option><option value="closed">Closed</option>
            </select>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            {violations.length === 0 ? <p className="text-gray-500 text-sm">No violations</p> : (
              <div className="space-y-2">
                {violations.map(v => (
                  <div key={v.id} className="bg-gray-700 rounded p-3 text-sm">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-medium">{v.user_name}</span>
                        <span className="text-xs text-gray-400 ml-2">{v.role_name}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs ${v.severity === 'critical' ? 'bg-red-900 text-red-300' : v.severity === 'high' ? 'bg-orange-900 text-orange-300' : 'bg-yellow-900 text-yellow-300'}`}>{v.severity}</span>
                    </div>
                    <div className="flex gap-2 mt-1 text-xs">
                      <span className="font-mono text-red-400">{v.permission_a}</span>
                      <span className="text-gray-500">✗</span>
                      <span className="font-mono text-red-400">{v.permission_b}</span>
                    </div>
                    <div className="flex gap-3 mt-1 text-xs text-gray-400">
                      <span>{v.rule_title}</span>
                      <span className={`px-1.5 py-0.5 rounded ${v.status === 'open' ? 'bg-red-900 text-red-300' : v.status === 'investigating' ? 'bg-yellow-900 text-yellow-300' : 'bg-green-900 text-green-300'}`}>{v.status}</span>
                      <span>{new Date(v.discovered_at).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
