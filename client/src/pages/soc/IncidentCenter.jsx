import React, { useState, useEffect } from 'react';
import { socApi } from '../../api/soc';

export function IncidentCenter() {
  const [incidents, setIncidents] = useState([]);
  const [stats, setStats] = useState(null);
  const [selected, setSelected] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ incidentType: 'unauthorized_access', severity: 'medium', title: '', description: '' });

  useEffect(() => {
    socApi.getIncidents().then(r => setIncidents(r.data.data)).catch(() => {});
    socApi.getIncidentStats().then(r => setStats(r.data.data)).catch(() => {});
  }, []);

  const handleCreate = async () => {
    await socApi.createIncident(form);
    setShowCreate(false);
    setForm({ incidentType: 'unauthorized_access', severity: 'medium', title: '', description: '' });
    const r = await socApi.getIncidents(); setIncidents(r.data.data);
  };

  const handleSelect = async (id) => {
    const r = await socApi.getIncident(id); setSelected(r.data.data);
  };

  const handleAddNote = async () => {
    const content = prompt('Add case note:');
    if (!content) return;
    await socApi.addCaseEntry(selected.id, { caseType: 'note', content });
    handleSelect(selected.id);
  };

  const handleClose = async (id) => {
    await socApi.updateIncident(id, { isClosed: true, resolution: prompt('Resolution:') || '' });
    setSelected(null);
    setIncidents((await socApi.getIncidents()).data.data);
  };

  const getSeverityBadge = (s) => {
    const map = { critical: 'bg-red-900 text-red-300', high: 'bg-orange-900 text-orange-300', medium: 'bg-yellow-900 text-yellow-300', low: 'bg-blue-900 text-blue-300' };
    return map[s] || 'bg-gray-700';
  };

  const types = ['unauthorized_access', 'data_leak', 'malware_infection', 'credential_compromise', 'suspicious_insider', 'infrastructure_attack'];
  const severities = ['low', 'medium', 'high', 'critical'];

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Incident Response Center</h1>
        <button onClick={() => setShowCreate(!showCreate)} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm">{showCreate ? 'Cancel' : 'New Incident'}</button>
      </div>

      {stats && (
        <div className="grid grid-cols-4 gap-3 text-sm">
          <div className="bg-gray-800 rounded p-2 text-center"><span className="font-bold">{stats.total}</span> Total</div>
          <div className="bg-gray-800 rounded p-2 text-center"><span className="text-red-400 font-bold">{stats.bySeverity?.find(s => s.severity === 'critical')?.count || 0}</span> Critical</div>
          <div className="bg-gray-800 rounded p-2 text-center"><span className="text-yellow-400 font-bold">{stats.byStatus?.find(s => s.status === 'open')?.count || 0}</span> Open</div>
          <div className="bg-gray-800 rounded p-2 text-center"><span className="text-green-400 font-bold">{stats.byStatus?.find(s => s.status === 'closed')?.count || 0}</span> Closed</div>
        </div>
      )}

      {showCreate && (
        <div className="bg-gray-800 rounded-lg p-4 space-y-3">
          <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Incident title" className="w-full bg-gray-700 px-3 py-2 rounded text-sm" />
          <div className="grid grid-cols-2 gap-3">
            <select value={form.incidentType} onChange={e => setForm(p => ({ ...p, incidentType: e.target.value }))} className="bg-gray-700 px-3 py-2 rounded text-sm">
              {types.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
            <select value={form.severity} onChange={e => setForm(p => ({ ...p, severity: e.target.value }))} className="bg-gray-700 px-3 py-2 rounded text-sm">
              {severities.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Description" className="w-full bg-gray-700 px-3 py-2 rounded text-sm" rows={3} />
          <button onClick={handleCreate} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-sm">Create Incident</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Incidents</h2>
          {incidents.length === 0 ? <p className="text-gray-500 text-sm">No incidents</p> : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {incidents.map(i => (
                <div key={i.id} onClick={() => handleSelect(i.id)} className={`p-3 rounded text-sm cursor-pointer border-l-4 ${i.severity === 'critical' ? 'border-red-500 bg-red-900/10' : i.severity === 'high' ? 'border-orange-500' : i.severity === 'medium' ? 'border-yellow-500' : 'border-blue-500'} ${selected?.id === i.id ? 'ring-1 ring-blue-500' : ''}`}>
                  <div className="flex justify-between"><span className="font-medium">{i.title}</span><span className={`px-2 py-0.5 rounded text-xs ${getSeverityBadge(i.severity)}`}>{i.severity}</span></div>
                  <div className="flex gap-3 mt-1 text-xs text-gray-400">
                    <span>{i.incident_type.replace(/_/g, ' ')}</span>
                    <span>{i.status}</span>
                    <span>{new Date(i.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selected && (
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h2 className="text-lg font-semibold">{selected.title}</h2>
                <span className={`text-xs px-2 py-0.5 rounded ${getSeverityBadge(selected.severity)}`}>{selected.severity}</span>
                <span className="ml-2 text-xs text-gray-400">{selected.incident_type.replace(/_/g, ' ')}</span>
              </div>
              {!selected.is_closed && <button onClick={() => handleClose(selected.id)} className="text-xs bg-red-700 hover:bg-red-600 px-2 py-1 rounded">Close</button>}
            </div>
            <p className="text-sm text-gray-300 mb-3">{selected.description}</p>
            {selected.root_cause && <div className="mb-2"><span className="text-xs text-gray-400">Root Cause:</span><p className="text-sm">{selected.root_cause}</p></div>}
            {selected.resolution && <div className="mb-2"><span className="text-xs text-gray-400">Resolution:</span><p className="text-sm">{selected.resolution}</p></div>}
            <div className="flex gap-4 text-xs text-gray-500 mb-3">
              <span>Status: {selected.status}</span>
              <span>Level: {selected.escalation_level}</span>
              <span>Assigned: {selected.assigned_name || 'Unassigned'}</span>
            </div>

            <div className="border-t border-gray-700 pt-3 mt-3">
              <h3 className="text-sm font-medium mb-2">Case Timeline</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {(selected.caseEntries || []).map(c => (
                  <div key={c.id} className="bg-gray-700 rounded p-2 text-sm">
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>{c.case_type} — {c.title || ''}</span>
                      <span>{c.created_by_name || ''} · {new Date(c.created_at).toLocaleString()}</span>
                    </div>
                    {c.content && <p className="mt-1">{c.content}</p>}
                    {c.evidence_path && <p className="text-xs text-blue-400 mt-1">Evidence: {c.evidence_path}</p>}
                  </div>
                ))}
              </div>
              <button onClick={handleAddNote} className="mt-2 text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded">Add Note</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
