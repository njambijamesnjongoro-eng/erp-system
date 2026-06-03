import React, { useState, useEffect } from 'react';
import { phase9Api } from '../../api/phase9';

export function ThreatHuntingCenter() {
  const [hunts, setHunts] = useState({ rows: [], total: 0 });
  const [form, setForm] = useState({ huntName: '', description: '', hypothesis: '', threatType: '', iocIndicators: '', affectedSystems: '' });

  const load = () => { phase9Api.getThreatHunts({ limit: 100 }).then(r => setHunts(r.data.data)).catch(() => {}); };

  useEffect(() => { load(); }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    phase9Api.createThreatHunt({
      ...form,
      iocIndicators: form.iocIndicators.split(',').map(s => s.trim()).filter(Boolean),
      affectedSystems: form.affectedSystems.split(',').map(s => s.trim()).filter(Boolean),
    }).then(() => {
      setForm({ huntName: '', description: '', hypothesis: '', threatType: '', iocIndicators: '', affectedSystems: '' });
      load();
    }).catch(() => {});
  };

  const updateStatus = (huntId, status) => {
    phase9Api.updateThreatHunt(huntId, { status }).then(load).catch(() => {});
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Threat Hunting Center</h1>
        <span className="text-sm text-gray-400">{hunts.total} hunts</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Active Hunts</h2>
          {hunts.rows.map(h => (
            <div key={h.id} className="p-3 bg-gray-750 rounded border border-gray-700 mb-2">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex gap-2 items-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${h.status === 'active' ? 'bg-green-900 text-green-300' : h.status === 'completed' ? 'bg-blue-900 text-blue-300' : 'bg-yellow-900 text-yellow-300'}`}>{h.status}</span>
                    <span className="text-sm font-medium">{h.hunt_name}</span>
                    <span className="text-xs text-gray-500">{h.threat_type || 'General'}</span>
                  </div>
                  {h.hypothesis && <div className="text-xs text-yellow-400 mt-1">Hypothesis: {h.hypothesis}</div>}
                  {h.findings && <div className="text-xs text-gray-400 mt-1">Findings: {h.findings}</div>}
                  <div className="text-xs text-gray-500 mt-1">Assigned: {h.assigned_to_name || 'Unassigned'}</div>
                </div>
                <div className="flex gap-2">
                  <select value={h.status} onChange={e => updateStatus(h.hunt_id, e.target.value)} className="bg-gray-700 rounded px-2 py-1 text-xs">
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">New Hunt</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input value={form.huntName} onChange={e => setForm({...form, huntName: e.target.value})} placeholder="Hunt Name" className="w-full bg-gray-700 rounded px-3 py-2 text-sm" required />
            <textarea value={form.hypothesis} onChange={e => setForm({...form, hypothesis: e.target.value})} placeholder="Hypothesis" className="w-full bg-gray-700 rounded px-3 py-2 text-sm" rows={2} />
            <input value={form.threatType} onChange={e => setForm({...form, threatType: e.target.value})} placeholder="Threat Type" className="w-full bg-gray-700 rounded px-3 py-2 text-sm" />
            <input value={form.iocIndicators} onChange={e => setForm({...form, iocIndicators: e.target.value})} placeholder="IOCs (comma separated)" className="w-full bg-gray-700 rounded px-3 py-2 text-sm" />
            <input value={form.affectedSystems} onChange={e => setForm({...form, affectedSystems: e.target.value})} placeholder="Systems (comma separated)" className="w-full bg-gray-700 rounded px-3 py-2 text-sm" />
            <button type="submit" className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded text-sm w-full">Start Hunt</button>
          </form>
        </div>
      </div>
    </div>
  );
}
