import React, { useState, useEffect } from 'react';
import { phase9Api } from '../../api/phase9';

export function CyberResilienceCenter() {
  const [plans, setPlans] = useState({ rows: [], total: 0 });
  const [irPlans, setIrPlans] = useState({ rows: [], total: 0 });
  const [form, setForm] = useState({ planName: '', planType: 'ransomware', description: '', recoverySteps: '', recoveryTimeObjective: 240, recoveryPointObjective: 60, stakeholders: '' });

  const load = () => {
    phase9Api.getResiliencePlans({ limit: 100 }).then(r => setPlans(r.data.data)).catch(() => {});
    phase9Api.getIncidentResponsePlans({ limit: 100 }).then(r => setIrPlans(r.data.data)).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    phase9Api.createResiliencePlan({
      ...form,
      recoverySteps: form.recoverySteps.split('\n').filter(Boolean),
      stakeholders: form.stakeholders.split(',').map(s => s.trim()).filter(Boolean),
    }).then(() => {
      setForm({ planName: '', planType: 'ransomware', description: '', recoverySteps: '', recoveryTimeObjective: 240, recoveryPointObjective: 60, stakeholders: '' });
      load();
    }).catch(() => {});
  };

  const testPlan = (planId) => {
    phase9Api.testResiliencePlan(planId).then(load).catch(() => {});
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Cyber Resilience Center</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Resilience Plans ({plans.total})</h2>
          {plans.rows.map(p => (
            <div key={p.id} className="p-3 bg-gray-750 rounded border border-gray-700 mb-2">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex gap-2 items-center">
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-900 text-blue-300">{p.plan_type}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${p.tested ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'}`}>{p.tested ? 'Tested' : 'Not Tested'}</span>
                    <span className="text-sm font-medium">{p.plan_name}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">RTO: {p.recovery_time_objective}m • RPO: {p.recovery_point_objective}m</div>
                  <div className="text-xs text-gray-500">Team: {p.responsible_team?.join(', ')}</div>
                </div>
                <button onClick={() => testPlan(p.plan_id)} className="text-xs text-blue-400 hover:text-blue-300">Test</button>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">New Plan</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input value={form.planName} onChange={e => setForm({...form, planName: e.target.value})} placeholder="Plan Name" className="w-full bg-gray-700 rounded px-3 py-2 text-sm" required />
            <select value={form.planType} onChange={e => setForm({...form, planType: e.target.value})} className="w-full bg-gray-700 rounded px-3 py-2 text-sm"><option value="ransomware">Ransomware</option><option value="data_breach">Data Breach</option><option value="infrastructure_failure">Infrastructure Failure</option><option value="cyber_attack">Cyber Attack</option><option value="crisis">Crisis</option></select>
            <div className="flex gap-2"><input value={form.recoveryTimeObjective} onChange={e => setForm({...form, recoveryTimeObjective: parseInt(e.target.value) || 0})} type="number" placeholder="RTO (min)" className="flex-1 bg-gray-700 rounded px-3 py-2 text-sm" /><input value={form.recoveryPointObjective} onChange={e => setForm({...form, recoveryPointObjective: parseInt(e.target.value) || 0})} type="number" placeholder="RPO (min)" className="flex-1 bg-gray-700 rounded px-3 py-2 text-sm" /></div>
            <textarea value={form.recoverySteps} onChange={e => setForm({...form, recoverySteps: e.target.value})} placeholder="Recovery steps (one per line)" className="w-full bg-gray-700 rounded px-3 py-2 text-sm" rows={3} />
            <input value={form.stakeholders} onChange={e => setForm({...form, stakeholders: e.target.value})} placeholder="Stakeholders (comma separated)" className="w-full bg-gray-700 rounded px-3 py-2 text-sm" />
            <button type="submit" className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-sm w-full">Create Plan</button>
          </form>
        </div>
      </div>

      {/* Incident Response Plans */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-3">Incident Response Plans ({irPlans.total})</h2>
        <div className="space-y-2">
          {irPlans.rows.map(ir => (
            <div key={ir.id} className="flex justify-between items-center p-3 bg-gray-750 rounded border border-gray-700">
              <div>
                <div className="flex gap-2 items-center">
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-900 text-red-300">{ir.severity}</span>
                  <span className="text-sm font-medium">{ir.plan_name}</span>
                  <span className="text-xs text-gray-500">{ir.incident_type}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Steps: {ir.response_steps?.length || 0} • Legal: {ir.legal_notification_required ? 'Required' : 'Not Required'} • Regulatory: {ir.regulatory_notification_required ? 'Required' : 'Not Required'} • Notify within {ir.notification_timeline_hours}h
                </div>
              </div>
              <span className={`text-xs ${ir.status === 'active' ? 'text-green-400' : 'text-gray-500'}`}>{ir.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
