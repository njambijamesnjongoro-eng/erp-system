import React, { useState, useEffect } from 'react';
import { grcApi } from '../../api/grc';

const invTypes = ['compliance', 'audit', 'policy_violation', 'security_violation', 'hr_issue', 'fraud'];

export function InvestigationCenter() {
  const [investigations, setInvestigations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [form, setForm] = useState({ title: '', description: '', investigationType: 'compliance', priority: 'medium', leadInvestigatorName: '', severity: 'medium' });
  const [evidenceForm, setEvidenceForm] = useState({ title: '', evidenceType: 'document', description: '' });

  useEffect(() => { fetchInvestigations(); }, [filterType]);

  const fetchInvestigations = () => {
    grcApi.getInvestigations({ type: filterType || undefined, limit: 100 }).then(r => setInvestigations(r.data.data?.data || [])).catch(() => {});
  };

  const handleCreate = async () => {
    await grcApi.createInvestigation(form);
    setShowForm(false);
    setForm({ title: '', description: '', investigationType: 'compliance', priority: 'medium', leadInvestigatorName: '', severity: 'medium' });
    fetchInvestigations();
  };

  const handleSelect = async (id) => {
    const r = await grcApi.getInvestigation(id);
    setSelected(r.data.data);
  };

  const handleAddEvidence = async () => {
    if (!selected) return;
    await grcApi.addInvestigationEvidence(selected.investigation_id, evidenceForm);
    setShowEvidence(false);
    setEvidenceForm({ title: '', evidenceType: 'document', description: '' });
    handleSelect(selected.investigation_id);
  };

  const severityColor = (s) => {
    const map = { critical: 'bg-red-900 text-red-300', high: 'bg-orange-900 text-orange-300', medium: 'bg-yellow-900 text-yellow-300', low: 'bg-blue-900 text-blue-300' };
    return map[s] || 'bg-gray-700';
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Investigation Center</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm">{showForm ? 'Cancel' : 'New Investigation'}</button>
      </div>

      {showForm && (
        <div className="bg-gray-800 rounded-lg p-4 space-y-3">
          <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Investigation Title" className="w-full bg-gray-700 px-3 py-2 rounded text-sm" />
          <div className="grid grid-cols-2 gap-3">
            <select value={form.investigationType} onChange={e => setForm(p => ({ ...p, investigationType: e.target.value }))} className="bg-gray-700 px-3 py-2 rounded text-sm">
              {invTypes.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
            <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))} className="bg-gray-700 px-3 py-2 rounded text-sm">
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
            </select>
          </div>
          <input value={form.leadInvestigatorName} onChange={e => setForm(p => ({ ...p, leadInvestigatorName: e.target.value }))} placeholder="Lead Investigator" className="bg-gray-700 px-3 py-2 rounded text-sm" />
          <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Description" className="w-full bg-gray-700 px-3 py-2 rounded text-sm" rows={3} />
          <button onClick={handleCreate} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-sm">Create</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="bg-gray-700 px-3 py-1.5 rounded text-sm mb-3">
            <option value="">All Types</option>{invTypes.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </select>
          {investigations.length === 0 ? <p className="text-gray-500 text-sm">No investigations</p> : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {investigations.map(inv => (
                <div key={inv.id} onClick={() => handleSelect(inv.investigation_id)} className={`bg-gray-700 rounded p-3 text-sm cursor-pointer hover:bg-gray-600 ${selected?.investigation_id === inv.investigation_id ? 'ring-1 ring-blue-500' : ''}`}>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{inv.title}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${inv.status === 'open' ? 'bg-red-900 text-red-300' : inv.status === 'completed' ? 'bg-green-900 text-green-300' : inv.status === 'in_progress' ? 'bg-yellow-900 text-yellow-300' : 'bg-blue-900 text-blue-300'}`}>{inv.status}</span>
                  </div>
                  <div className="flex gap-2 mt-1 text-xs text-gray-400">
                    <span>{inv.investigation_type?.replace(/_/g, ' ')}</span>
                    <span>{inv.priority}</span>
                    <span>{inv.lead_investigator_name}</span>
                    <span>{new Date(inv.created_at).toLocaleDateString()}</span>
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
                <div className="flex gap-2 mt-1">
                  <span className={`px-2 py-0.5 rounded text-xs ${severityColor(selected.severity)}`}>{selected.severity}</span>
                  <span className="text-xs text-gray-400">{selected.investigation_type?.replace(/_/g, ' ')}</span>
                  <span className="text-xs text-gray-400">{selected.confidentiality_level}</span>
                </div>
              </div>
              <button onClick={() => setShowEvidence(!showEvidence)} className="text-xs bg-blue-700 hover:bg-blue-600 px-2 py-1 rounded">Add Evidence</button>
            </div>

            {showEvidence && (
              <div className="bg-gray-700 rounded p-3 space-y-2 mb-3">
                <input value={evidenceForm.title} onChange={e => setEvidenceForm(p => ({ ...p, title: e.target.value }))} placeholder="Evidence title" className="w-full bg-gray-600 px-2 py-1 rounded text-xs" />
                <select value={evidenceForm.evidenceType} onChange={e => setEvidenceForm(p => ({ ...p, evidenceType: e.target.value }))} className="w-full bg-gray-600 px-2 py-1 rounded text-xs">
                  <option value="document">Document</option><option value="screenshot">Screenshot</option><option value="log">Log</option><option value="email">Email</option><option value="statement">Statement</option>
                </select>
                <textarea value={evidenceForm.description} onChange={e => setEvidenceForm(p => ({ ...p, description: e.target.value }))} placeholder="Description" className="w-full bg-gray-600 px-2 py-1 rounded text-xs" rows={2} />
                <button onClick={handleAddEvidence} className="bg-green-700 hover:bg-green-600 px-3 py-1 rounded text-xs">Add Evidence</button>
              </div>
            )}

            {selected.description && <p className="text-sm mb-3">{selected.description}</p>}
            <div className="flex gap-3 text-xs text-gray-500 mb-3">
              <span>Lead: {selected.lead_investigator_name}</span>
              <span>Priority: {selected.priority}</span>
              <span>Opened: {new Date(selected.opened_date).toLocaleDateString()}</span>
              {selected.closed_date && <span>Closed: {new Date(selected.closed_date).toLocaleDateString()}</span>}
            </div>

            {selected.findings && <div className="mb-2"><span className="text-xs text-gray-400">Findings:</span><p className="text-sm">{selected.findings}</p></div>}
            {selected.conclusion && <div className="mb-2"><span className="text-xs text-gray-400">Conclusion:</span><p className="text-sm">{selected.conclusion}</p></div>}
            {selected.recommendations && <div className="mb-2"><span className="text-xs text-gray-400">Recommendations:</span><p className="text-sm">{selected.recommendations}</p></div>}

            {/* Evidence */}
            {selected.evidence?.length > 0 && (
              <div className="border-t border-gray-700 pt-3">
                <h3 className="text-sm font-medium mb-2">Evidence ({selected.evidence.length})</h3>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {selected.evidence.map(ev => (
                    <div key={ev.id} className="bg-gray-700 rounded p-2 text-xs">
                      <div className="flex justify-between">
                        <span className="font-medium">{ev.title || 'Untitled'}</span>
                        <span className="text-gray-400">{ev.evidence_type}</span>
                      </div>
                      {ev.description && <p className="text-gray-400 mt-1">{ev.description}</p>}
                      <span className="text-gray-500">{ev.submitted_by_name} · {new Date(ev.submitted_at).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
