import React, { useState, useEffect } from 'react';
import { grcApi } from '../../api/grc';

const riskCategories = ['operational', 'financial', 'security', 'compliance', 'procurement', 'vendor', 'strategic', 'reputational'];
const treatments = ['accept', 'mitigate', 'transfer', 'avoid'];

export function RiskManagement() {
  const [risks, setRisks] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showAssessment, setShowAssessment] = useState(false);
  const [filter, setFilter] = useState({ category: '', level: '' });
  const [form, setForm] = useState({ title: '', description: '', riskCategory: 'operational', department: '', ownerName: '', inherentLikelihood: 3, inherentImpact: 3, treatmentStrategy: 'mitigate', mitigationPlan: '' });
  const [assessForm, setAssessForm] = useState({ likelihoodScore: 3, impactScore: 3, assessmentNotes: '' });

  useEffect(() => { fetchRisks(); }, [filter]);

  const fetchRisks = () => {
    grcApi.getRisks({ category: filter.category || undefined, level: filter.level || undefined, limit: 100 }).then(r => setRisks(r.data.data?.data || [])).catch(() => {});
  };

  const handleCreate = async () => {
    await grcApi.createRisk(form);
    setShowForm(false);
    setForm({ title: '', description: '', riskCategory: 'operational', department: '', ownerName: '', inherentLikelihood: 3, inherentImpact: 3, treatmentStrategy: 'mitigate', mitigationPlan: '' });
    fetchRisks();
  };

  const handleSelect = async (id) => {
    const r = await grcApi.getRisk(id);
    setSelected(r.data.data);
  };

  const handleAssess = async () => {
    if (!selected) return;
    await grcApi.createRiskAssessment({ riskId: selected.risk_id, title: `Assessment - ${new Date().toLocaleDateString()}`, ...assessForm });
    setShowAssessment(false);
    handleSelect(selected.risk_id);
  };

  const riskLevelColor = (l) => {
    const map = { critical: 'bg-red-900 text-red-300', high: 'bg-orange-900 text-orange-300', medium: 'bg-yellow-900 text-yellow-300', low: 'bg-green-900 text-green-300' };
    return map[l] || 'bg-gray-700';
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Risk Management Framework</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm">{showForm ? 'Cancel' : 'New Risk'}</button>
      </div>

      {showForm && (
        <div className="bg-gray-800 rounded-lg p-4 space-y-3">
          <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Risk Title" className="w-full bg-gray-700 px-3 py-2 rounded text-sm" />
          <div className="grid grid-cols-3 gap-3">
            <select value={form.riskCategory} onChange={e => setForm(p => ({ ...p, riskCategory: e.target.value }))} className="bg-gray-700 px-3 py-2 rounded text-sm">
              {riskCategories.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
            </select>
            <input value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} placeholder="Department" className="bg-gray-700 px-3 py-2 rounded text-sm" />
            <input value={form.ownerName} onChange={e => setForm(p => ({ ...p, ownerName: e.target.value }))} placeholder="Risk Owner" className="bg-gray-700 px-3 py-2 rounded text-sm" />
          </div>
          <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Description" className="w-full bg-gray-700 px-3 py-2 rounded text-sm" rows={2} />
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-gray-400 block mb-1">Inherent Likelihood (1-5)</label>
              <input type="number" min={1} max={5} value={form.inherentLikelihood} onChange={e => setForm(p => ({ ...p, inherentLikelihood: parseInt(e.target.value) || 1 }))} className="w-full bg-gray-700 px-3 py-2 rounded text-sm" /></div>
            <div><label className="text-xs text-gray-400 block mb-1">Inherent Impact (1-5)</label>
              <input type="number" min={1} max={5} value={form.inherentImpact} onChange={e => setForm(p => ({ ...p, inherentImpact: parseInt(e.target.value) || 1 }))} className="w-full bg-gray-700 px-3 py-2 rounded text-sm" /></div>
          </div>
          <select value={form.treatmentStrategy} onChange={e => setForm(p => ({ ...p, treatmentStrategy: e.target.value }))} className="bg-gray-700 px-3 py-2 rounded text-sm w-full">
            {treatments.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
          <textarea value={form.mitigationPlan} onChange={e => setForm(p => ({ ...p, mitigationPlan: e.target.value }))} placeholder="Mitigation Plan" className="w-full bg-gray-700 px-3 py-2 rounded text-sm" rows={3} />
          <button onClick={handleCreate} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-sm">Create Risk</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex gap-2 mb-3">
            <select value={filter.category} onChange={e => setFilter(p => ({ ...p, category: e.target.value }))} className="bg-gray-700 px-3 py-1.5 rounded text-sm">
              <option value="">All Categories</option>{riskCategories.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
            </select>
            <select value={filter.level} onChange={e => setFilter(p => ({ ...p, level: e.target.value }))} className="bg-gray-700 px-3 py-1.5 rounded text-sm">
              <option value="">All Levels</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
            </select>
          </div>
          {risks.length === 0 ? <p className="text-gray-500 text-sm">No risks</p> : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {risks.map(r => (
                <div key={r.id} onClick={() => handleSelect(r.risk_id)} className={`bg-gray-700 rounded p-3 text-sm cursor-pointer hover:bg-gray-600 ${selected?.risk_id === r.risk_id ? 'ring-1 ring-blue-500' : ''}`}>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{r.title}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${riskLevelColor(r.residual_risk_level || r.inherent_risk_level)}`}>{r.residual_risk_level || r.inherent_risk_level}</span>
                  </div>
                  <div className="flex gap-2 mt-1 text-xs text-gray-400">
                    <span>{r.risk_category}</span><span>Score: {r.inherent_risk_score?.toFixed(1)}</span><span>{r.department}</span>
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
                <span className="text-xs text-gray-400">{selected.risk_category} · {selected.department}</span>
              </div>
              <button onClick={() => setShowAssessment(!showAssessment)} className="text-xs bg-blue-700 hover:bg-blue-600 px-2 py-1 rounded">Assess</button>
            </div>

            {/* Risk Scores */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-gray-700 rounded p-2 text-center">
                <div className="text-xs text-gray-400">Inherent</div>
                <div className={`text-lg font-bold ${riskLevelColor(selected.inherent_risk_level)}`}>{selected.inherent_risk_score?.toFixed(1)}</div>
                <div className="text-xs text-gray-500">L{selected.inherent_likelihood} × I{selected.inherent_impact}</div>
              </div>
              <div className="bg-gray-700 rounded p-2 text-center">
                <div className="text-xs text-gray-400">Residual</div>
                <div className={`text-lg font-bold ${selected.residual_risk_level ? riskLevelColor(selected.residual_risk_level) : 'text-gray-500'}`}>{selected.residual_risk_score?.toFixed(1) || 'N/A'}</div>
                <div className="text-xs text-gray-500">{selected.residual_likelihood && selected.residual_impact ? `L${selected.residual_likelihood} × I${selected.residual_impact}` : 'Not assessed'}</div>
              </div>
              <div className="bg-gray-700 rounded p-2 text-center">
                <div className="text-xs text-gray-400">Treatment</div>
                <div className="text-lg font-bold capitalize">{selected.treatment_strategy || 'N/A'}</div>
                <div className="text-xs text-gray-500">{selected.mitigation_progress || 0}% complete</div>
              </div>
            </div>

            {showAssessment && (
              <div className="bg-gray-700 rounded p-3 space-y-2 mb-3">
                <h3 className="text-sm font-medium">New Assessment</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-xs text-gray-400">Likelihood (1-5)</label>
                    <input type="number" min={1} max={5} value={assessForm.likelihoodScore} onChange={e => setAssessForm(p => ({ ...p, likelihoodScore: parseInt(e.target.value) || 1 }))} className="w-full bg-gray-600 px-2 py-1 rounded text-xs" /></div>
                  <div><label className="text-xs text-gray-400">Impact (1-5)</label>
                    <input type="number" min={1} max={5} value={assessForm.impactScore} onChange={e => setAssessForm(p => ({ ...p, impactScore: parseInt(e.target.value) || 1 }))} className="w-full bg-gray-600 px-2 py-1 rounded text-xs" /></div>
                </div>
                <textarea value={assessForm.assessmentNotes} onChange={e => setAssessForm(p => ({ ...p, assessmentNotes: e.target.value }))} placeholder="Assessment notes" className="w-full bg-gray-600 px-2 py-1 rounded text-xs" rows={2} />
                <button onClick={handleAssess} className="bg-green-700 hover:bg-green-600 px-3 py-1 rounded text-xs">Submit Assessment</button>
              </div>
            )}

            {selected.description && <p className="text-sm mb-2">{selected.description}</p>}
            {selected.mitigation_plan && <div className="mb-2"><span className="text-xs text-gray-400">Mitigation:</span><p className="text-sm">{selected.mitigation_plan}</p></div>}
            <div className="flex gap-3 text-xs text-gray-500 mb-3">
              <span>Owner: {selected.owner_name}</span>
              <span>Status: {selected.status}</span>
              <span>Control: {selected.control_effectiveness || 'N/A'}</span>
            </div>

            {/* Assessment History */}
            {selected.assessments?.length > 0 && (
              <div className="border-t border-gray-700 pt-3">
                <h3 className="text-sm font-medium mb-2">Assessment History</h3>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {selected.assessments.map(a => (
                    <div key={a.id} className="bg-gray-700 rounded p-2 text-xs flex justify-between">
                      <span>{a.assessment_type}</span>
                      <span className={riskLevelColor(a.risk_level)}>Score: {a.risk_score?.toFixed(1)}</span>
                      <span className="text-gray-500">{new Date(a.assessed_at).toLocaleDateString()}</span>
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
