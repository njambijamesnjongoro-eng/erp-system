import React, { useState, useEffect } from 'react';
import { phase9Api } from '../../api/phase9';

export function InsiderThreatCenter() {
  const [threats, setThreats] = useState({ rows: [], total: 0 });
  const [form, setForm] = useState({ userId: '', userName: '', department: '', threatType: 'data_exfiltration', severity: 'medium', riskScore: 50, description: '', indicators: '', evidence: '' });

  const load = () => { phase9Api.getInsiderThreats({ limit: 100 }).then(r => setThreats(r.data.data)).catch(() => {}); };

  useEffect(() => { load(); }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    phase9Api.createInsiderThreat({
      ...form,
      riskScore: parseInt(form.riskScore),
      indicators: form.indicators.split(',').map(s => s.trim()).filter(Boolean),
      evidence: form.evidence.split(',').map(s => s.trim()).filter(Boolean),
    }).then(() => {
      setForm({ userId: '', userName: '', department: '', threatType: 'data_exfiltration', severity: 'medium', riskScore: 50, description: '', indicators: '', evidence: '' });
      load();
    }).catch(() => {});
  };

  const update = (caseId, data) => {
    phase9Api.updateInsiderThreat(caseId, data).then(load).catch(() => {});
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Insider Threat Program</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Cases ({threats.total})</h2>
          {threats.rows.map(t => (
            <div key={t.id} className="p-3 bg-gray-750 rounded border border-gray-700 mb-2">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex gap-2 items-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${t.severity === 'critical' ? 'bg-red-900 text-red-300' : t.severity === 'high' ? 'bg-orange-900 text-orange-300' : 'bg-yellow-900 text-yellow-300'}`}>{t.severity}</span>
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-600 text-gray-300">{t.threat_type}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${t.status === 'open' ? 'bg-red-900 text-red-300' : t.status === 'investigating' ? 'bg-yellow-900 text-yellow-300' : t.status === 'confirmed' ? 'bg-orange-900 text-orange-300' : 'bg-green-900 text-green-300'}`}>{t.status}</span>
                    <span className="text-sm font-medium">{t.user_name}</span>
                    <span className="text-xs text-gray-500">{t.department}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Risk: {t.risk_score} • {t.description}</div>
                  {t.indicators?.length > 0 && <div className="text-xs text-gray-400 mt-1">Indicators: {t.indicators.join(', ')}</div>}
                </div>
                <div className="flex flex-col gap-1">
                  <select value={t.status} onChange={e => update(t.case_id, { status: e.target.value })} className="bg-gray-700 rounded px-2 py-1 text-xs">
                    <option value="open">Open</option>
                    <option value="investigating">Investigating</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="false_positive">False Positive</option>
                    <option value="remediated">Remediated</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Report Threat</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input value={form.userName} onChange={e => setForm({...form, userName: e.target.value})} placeholder="User Name" className="w-full bg-gray-700 rounded px-3 py-2 text-sm" required />
            <select value={form.threatType} onChange={e => setForm({...form, threatType: e.target.value})} className="w-full bg-gray-700 rounded px-3 py-2 text-sm"><option value="data_exfiltration">Data Exfiltration</option><option value="privilege_abuse">Privilege Abuse</option><option value="executive_access">Executive Data Access</option><option value="suspicious_export">Suspicious Export</option></select>
            <div className="flex gap-2">
              <select value={form.severity} onChange={e => setForm({...form, severity: e.target.value})} className="flex-1 bg-gray-700 rounded px-3 py-2 text-sm"><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>
              <input value={form.riskScore} onChange={e => setForm({...form, riskScore: e.target.value})} type="number" min="0" max="100" placeholder="Risk" className="w-20 bg-gray-700 rounded px-3 py-2 text-sm" />
            </div>
            <input value={form.department} onChange={e => setForm({...form, department: e.target.value})} placeholder="Department" className="w-full bg-gray-700 rounded px-3 py-2 text-sm" />
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Description" className="w-full bg-gray-700 rounded px-3 py-2 text-sm" rows={2} />
            <button type="submit" className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-sm w-full">Report Threat</button>
          </form>
        </div>
      </div>
    </div>
  );
}
