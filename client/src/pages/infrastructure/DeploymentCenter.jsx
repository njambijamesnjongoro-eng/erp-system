import React, { useState, useEffect } from 'react';
import { infrastructureSecurityApi } from '../../api/infrastructureSecurity';

export function DeploymentCenter() {
  const [deployments, setDeployments] = useState({ rows: [], total: 0 });
  const [form, setForm] = useState({ application: '', version: '', environment: 'production', deploymentType: 'incremental', branch: 'main', commitHash: '', commitMessage: '', notes: '' });

  const load = () => { infrastructureSecurityApi.getDeployments({ limit: 100 }).then(r => setDeployments(r.data.data)).catch(() => {}); };

  useEffect(() => { load(); }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    infrastructureSecurityApi.createDeployment(form).then(() => {
      setForm({ application: '', version: '', environment: 'production', deploymentType: 'incremental', branch: 'main', commitHash: '', commitMessage: '', notes: '' });
      load();
    }).catch(() => {});
  };

  const action = (id, fn) => {
    fn(id).then(load).catch(() => {});
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Deployment Center</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Deployments ({deployments.total})</h2>
          <div className="space-y-2">
            {deployments.rows.map(d => (
              <div key={d.deployment_id} className="p-3 bg-gray-750 rounded border border-gray-700">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex gap-2 items-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${d.status === 'success' ? 'bg-green-900 text-green-300' : d.status === 'failed' ? 'bg-red-900 text-red-300' : d.status === 'rolled_back' ? 'bg-orange-900 text-orange-300' : 'bg-yellow-900 text-yellow-300'}`}>{d.status}</span>
                      <span className="text-sm font-medium">{d.application}</span>
                      <span className="text-xs text-gray-500">v{d.version}</span>
                      <span className="text-xs text-gray-500">{d.environment}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {d.branch} • {d.commit_hash?.slice(0, 8)} • {d.deployed_by_name}
                      {d.duration_seconds && ` • ${Math.floor(d.duration_seconds / 60)}m ${d.duration_seconds % 60}s`}
                    </div>
                    {d.commit_message && <div className="text-xs text-gray-400 mt-1">{d.commit_message}</div>}
                  </div>
                  <div className="flex gap-2">
                    {d.status === 'pending' && <button onClick={() => action(d.deployment_id, (id) => infrastructureSecurityApi.approveDeployment(id))} className="text-xs text-green-400 hover:text-green-300">Approve</button>}
                    {d.status === 'approved' && <button onClick={() => action(d.deployment_id, (id) => infrastructureSecurityApi.deployVersion(id))} className="text-xs text-blue-400 hover:text-blue-300">Deploy</button>}
                    {(d.status === 'success' || d.status === 'failed') && <button onClick={() => { const r = prompt('Rollback reason:'); if (r) action(d.deployment_id, (id) => infrastructureSecurityApi.rollbackDeployment(id, r)); }} className="text-xs text-red-400 hover:text-red-300">Rollback</button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">New Deployment</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input value={form.application} onChange={e => setForm({...form, application: e.target.value})} placeholder="Application Name" className="w-full bg-gray-700 rounded px-3 py-2 text-sm" required />
            <div className="flex gap-2">
              <input value={form.version} onChange={e => setForm({...form, version: e.target.value})} placeholder="Version" className="flex-1 bg-gray-700 rounded px-3 py-2 text-sm" required />
              <select value={form.environment} onChange={e => setForm({...form, environment: e.target.value})} className="bg-gray-700 rounded px-3 py-2 text-sm"><option value="production">Production</option><option value="staging">Staging</option><option value="development">Dev</option></select>
            </div>
            <select value={form.deploymentType} onChange={e => setForm({...form, deploymentType: e.target.value})} className="w-full bg-gray-700 rounded px-3 py-2 text-sm"><option value="full">Full</option><option value="incremental">Incremental</option><option value="hotfix">Hotfix</option></select>
            <input value={form.branch} onChange={e => setForm({...form, branch: e.target.value})} placeholder="Branch" className="w-full bg-gray-700 rounded px-3 py-2 text-sm" />
            <input value={form.commitHash} onChange={e => setForm({...form, commitHash: e.target.value})} placeholder="Commit Hash" className="w-full bg-gray-700 rounded px-3 py-2 text-sm" />
            <input value={form.commitMessage} onChange={e => setForm({...form, commitMessage: e.target.value})} placeholder="Commit Message" className="w-full bg-gray-700 rounded px-3 py-2 text-sm" />
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm w-full">Create Deployment</button>
          </form>
        </div>
      </div>
    </div>
  );
}
