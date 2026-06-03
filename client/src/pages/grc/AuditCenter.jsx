import React, { useState, useEffect } from 'react';
import { grcApi } from '../../api/grc';

const auditTypes = ['internal', 'external', 'financial', 'security', 'hr', 'procurement'];
const severities = ['critical', 'high', 'medium', 'low', 'informational'];

export function AuditCenter() {
  const [audits, setAudits] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showFindingForm, setShowFindingForm] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [form, setForm] = useState({ title: '', auditType: 'internal', scope: '', objectives: '', priority: 'medium', leadAuditorName: '', scheduledStartDate: '', scheduledEndDate: '', auditedEntity: '' });
  const [findingForm, setFindingForm] = useState({ title: '', description: '', severity: 'medium', findingType: 'control_gap', recommendation: '', assignedToName: '', dueDate: '' });

  useEffect(() => { fetchAudits(); }, [filterType]);

  const fetchAudits = () => {
    grcApi.getAudits({ type: filterType || undefined, limit: 100 }).then(r => setAudits(r.data.data?.data || [])).catch(() => {});
  };

  const handleCreate = async () => {
    await grcApi.createAudit(form);
    setShowForm(false);
    setForm({ title: '', auditType: 'internal', scope: '', objectives: '', priority: 'medium', leadAuditorName: '', scheduledStartDate: '', scheduledEndDate: '', auditedEntity: '' });
    fetchAudits();
  };

  const handleSelect = async (id) => {
    const r = await grcApi.getAudit(id);
    setSelected(r.data.data);
  };

  const handleAddFinding = async () => {
    if (!selected) return;
    await grcApi.createAuditFinding(selected.audit_id, findingForm);
    setShowFindingForm(false);
    setFindingForm({ title: '', description: '', severity: 'medium', findingType: 'control_gap', recommendation: '', assignedToName: '', dueDate: '' });
    handleSelect(selected.audit_id);
  };

  const handleUpdateStatus = async (status) => {
    if (!selected) return;
    await grcApi.updateAudit(selected.audit_id, { status });
    fetchAudits();
    handleSelect(selected.audit_id);
  };

  const severityColor = (s) => {
    const map = { critical: 'bg-red-900 text-red-300', high: 'bg-orange-900 text-orange-300', medium: 'bg-yellow-900 text-yellow-300', low: 'bg-blue-900 text-blue-300', informational: 'bg-gray-600' };
    return map[s] || 'bg-gray-700';
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Audit Management Center</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm">{showForm ? 'Cancel' : 'New Audit'}</button>
      </div>

      {showForm && (
        <div className="bg-gray-800 rounded-lg p-4 space-y-3">
          <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Audit Title" className="w-full bg-gray-700 px-3 py-2 rounded text-sm" />
          <div className="grid grid-cols-2 gap-3">
            <select value={form.auditType} onChange={e => setForm(p => ({ ...p, auditType: e.target.value }))} className="bg-gray-700 px-3 py-2 rounded text-sm">
              {auditTypes.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
            <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))} className="bg-gray-700 px-3 py-2 rounded text-sm">
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
            </select>
          </div>
          <textarea value={form.scope} onChange={e => setForm(p => ({ ...p, scope: e.target.value }))} placeholder="Scope" className="w-full bg-gray-700 px-3 py-2 rounded text-sm" rows={2} />
          <textarea value={form.objectives} onChange={e => setForm(p => ({ ...p, objectives: e.target.value }))} placeholder="Objectives" className="w-full bg-gray-700 px-3 py-2 rounded text-sm" rows={2} />
          <div className="grid grid-cols-2 gap-3">
            <input value={form.leadAuditorName} onChange={e => setForm(p => ({ ...p, leadAuditorName: e.target.value }))} placeholder="Lead Auditor" className="bg-gray-700 px-3 py-2 rounded text-sm" />
            <input value={form.auditedEntity} onChange={e => setForm(p => ({ ...p, auditedEntity: e.target.value }))} placeholder="Audited Entity" className="bg-gray-700 px-3 py-2 rounded text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="date" value={form.scheduledStartDate} onChange={e => setForm(p => ({ ...p, scheduledStartDate: e.target.value }))} className="bg-gray-700 px-3 py-2 rounded text-sm" />
            <input type="date" value={form.scheduledEndDate} onChange={e => setForm(p => ({ ...p, scheduledEndDate: e.target.value }))} className="bg-gray-700 px-3 py-2 rounded text-sm" />
          </div>
          <button onClick={handleCreate} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-sm">Create Audit</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="bg-gray-700 px-3 py-1.5 rounded text-sm mb-3">
            <option value="">All Types</option>{auditTypes.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </select>
          {audits.length === 0 ? <p className="text-gray-500 text-sm">No audits</p> : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {audits.map(a => (
                <div key={a.id} onClick={() => handleSelect(a.audit_id)} className={`bg-gray-700 rounded p-3 text-sm cursor-pointer hover:bg-gray-600 ${selected?.audit_id === a.audit_id ? 'ring-1 ring-blue-500' : ''}`}>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{a.title}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${a.status === 'completed' ? 'bg-green-900 text-green-300' : a.status === 'in_progress' ? 'bg-yellow-900 text-yellow-300' : a.status === 'planned' ? 'bg-blue-900 text-blue-300' : 'bg-gray-600'}`}>{a.status}</span>
                  </div>
                  <div className="flex gap-2 mt-1 text-xs text-gray-400">
                    <span>{a.audit_type}</span><span>{a.lead_auditor_name}</span><span>{a.scheduled_start_date?.slice(0, 10)}</span>
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
                <span className="text-xs text-gray-400">{selected.audit_type} · {selected.priority} priority</span>
              </div>
              <div className="flex gap-2">
                {selected.status === 'planned' && <button onClick={() => handleUpdateStatus('in_progress')} className="text-xs bg-yellow-700 hover:bg-yellow-600 px-2 py-1 rounded">Start</button>}
                {selected.status === 'in_progress' && <button onClick={() => handleUpdateStatus('completed')} className="text-xs bg-green-700 hover:bg-green-600 px-2 py-1 rounded">Complete</button>}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center mb-3">
              <div className={`bg-gray-700 rounded p-2 ${selected.critical_findings > 0 ? 'border border-red-500' : ''}`}><div className="text-lg font-bold text-red-400">{selected.critical_findings}</div><div className="text-xs text-gray-400">Critical</div></div>
              <div className="bg-gray-700 rounded p-2"><div className="text-lg font-bold text-orange-400">{selected.high_findings}</div><div className="text-xs text-gray-400">High</div></div>
              <div className="bg-gray-700 rounded p-2"><div className="text-lg font-bold text-yellow-400">{selected.medium_findings}</div><div className="text-xs text-gray-400">Medium</div></div>
            </div>
            {selected.scope && <p className="text-sm mb-2"><span className="text-gray-400">Scope:</span> {selected.scope}</p>}
            {selected.objectives && <p className="text-sm mb-2"><span className="text-gray-400">Objectives:</span> {selected.objectives}</p>}
            <div className="flex gap-3 text-xs text-gray-500 mb-3">
              <span>Lead: {selected.lead_auditor_name}</span>
              <span>Entity: {selected.audited_entity}</span>
              <span>{selected.scheduled_start_date?.slice(0, 10)} → {selected.scheduled_end_date?.slice(0, 10)}</span>
            </div>

            {/* Findings */}
            <div className="border-t border-gray-700 pt-3">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium">Findings ({selected.findings?.length || 0})</h3>
                <button onClick={() => setShowFindingForm(!showFindingForm)} className="text-xs bg-blue-700 hover:bg-blue-600 px-2 py-1 rounded">Add Finding</button>
              </div>
              {showFindingForm && (
                <div className="bg-gray-700 rounded p-3 space-y-2 mb-2">
                  <input value={findingForm.title} onChange={e => setFindingForm(p => ({ ...p, title: e.target.value }))} placeholder="Finding title" className="w-full bg-gray-600 px-2 py-1 rounded text-xs" />
                  <select value={findingForm.severity} onChange={e => setFindingForm(p => ({ ...p, severity: e.target.value }))} className="bg-gray-600 px-2 py-1 rounded text-xs w-full">
                    {severities.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <textarea value={findingForm.description} onChange={e => setFindingForm(p => ({ ...p, description: e.target.value }))} placeholder="Description" className="w-full bg-gray-600 px-2 py-1 rounded text-xs" rows={2} />
                  <textarea value={findingForm.recommendation} onChange={e => setFindingForm(p => ({ ...p, recommendation: e.target.value }))} placeholder="Recommendation" className="w-full bg-gray-600 px-2 py-1 rounded text-xs" rows={2} />
                  <button onClick={handleAddFinding} className="bg-green-700 hover:bg-green-600 px-3 py-1 rounded text-xs">Add</button>
                </div>
              )}
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {(selected.findings || []).map(f => (
                  <div key={f.id} className="bg-gray-700 rounded p-2 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium">{f.title}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${severityColor(f.severity)}`}>{f.severity}</span>
                    </div>
                    <div className="flex gap-2 mt-1 text-xs text-gray-400">
                      <span>{f.finding_type?.replace(/_/g, ' ')}</span>
                      <span className={`px-1.5 py-0.5 rounded ${f.status === 'open' ? 'bg-red-900 text-red-300' : f.status === 'resolved' ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'}`}>{f.status}</span>
                      <span>{f.assigned_to_name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
