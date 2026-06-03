import React, { useState, useEffect } from 'react';
import { phase9Api } from '../../api/phase9';

export function ComplianceCenter() {
  const [mapping, setMapping] = useState({ rows: [], total: 0 });
  const [filter, setFilter] = useState('');

  useEffect(() => { phase9Api.getComplianceMapping({ limit: 100 }).then(r => setMapping(r.data.data)).catch(() => {}); }, []);

  const updateControl = (id, data) => {
    phase9Api.updateComplianceControl(id, data).then(() => {
      phase9Api.getComplianceMapping({ limit: 100 }).then(r => setMapping(r.data.data)).catch(() => {});
    }).catch(() => {});
  };

  const standards = [...new Set(mapping.rows.map(m => m.standard))];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Compliance Readiness Center</h1>

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilter('')} className={`px-3 py-1 rounded text-xs ${!filter ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}>All</button>
        {standards.map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1 rounded text-xs ${filter === s ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}>{s}</button>
        ))}
      </div>

      <div className="bg-gray-800 rounded-lg p-4">
        {mapping.rows.filter(m => !filter || m.standard === filter).map(m => (
          <div key={m.id} className="flex justify-between items-center p-3 bg-gray-750 rounded border border-gray-700 mb-2">
            <div>
              <div className="flex gap-2 items-center">
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-indigo-900 text-indigo-300">{m.standard}</span>
                <span className="text-sm font-medium">{m.control_id}: {m.control_name}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">{m.description}</div>
            </div>
            <div className="flex items-center gap-2">
              <select value={m.status} onChange={e => updateControl(m.id, { status: e.target.value })} className="bg-gray-700 rounded px-2 py-1 text-xs">
                <option value="not_implemented">Not Implemented</option>
                <option value="in_progress">In Progress</option>
                <option value="implemented">Implemented</option>
                <option value="tested">Tested</option>
                <option value="compliant">Compliant</option>
              </select>
              {m.tested_date && <span className="text-xs text-gray-500">Tested: {new Date(m.tested_date).toLocaleDateString()}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
