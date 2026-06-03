import React, { useState, useEffect } from 'react';
import { infrastructureSecurityApi } from '../../api/infrastructureSecurity';

export function CloudManagement() {
  const [resources, setResources] = useState({ rows: [], total: 0 });
  const [score, setScore] = useState(null);
  const [form, setForm] = useState({ cloudProvider: 'aws', resourceType: 'ec2', resourceName: '', region: 'us-east-1', status: 'active', costMonthly: 0, encryptionEnabled: true, publicAccess: false, tags: [] });

  const load = () => {
    infrastructureSecurityApi.getCloudResources({ limit: 100 }).then(r => setResources(r.data.data)).catch(() => {});
    infrastructureSecurityApi.getCloudSecurityScore().then(r => setScore(r.data.data)).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    infrastructureSecurityApi.createCloudResource(form).then(() => {
      setForm({ cloudProvider: 'aws', resourceType: 'ec2', resourceName: '', region: 'us-east-1', status: 'active', costMonthly: 0, encryptionEnabled: true, publicAccess: false, tags: [] });
      load();
    }).catch(() => {});
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Cloud Resource Management</h1>

      {score && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-blue-400">{score.score}</div>
            <div className="text-sm text-gray-400">Security Score</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-gray-300">{score.total}</div>
            <div className="text-sm text-gray-400">Total Resources</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-green-400">{score.encrypted}</div>
            <div className="text-sm text-gray-400">Encrypted</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-red-400">{score.public}</div>
            <div className="text-sm text-gray-400">Public Access</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Resources ({resources.total})</h2>
          <div className="space-y-2">
            {resources.rows.map(r => (
              <div key={r.resource_id} className="flex justify-between items-center p-3 bg-gray-750 rounded border border-gray-700">
                <div>
                  <div className="flex gap-2 items-center">
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-900 text-blue-300">{r.cloud_provider}</span>
                    <span className="text-sm font-medium">{r.resource_name || r.resource_id}</span>
                    <span className="text-xs text-gray-500">{r.resource_type}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {r.region} • ${r.cost_monthly?.toFixed(2)}/mo • {r.encryption_enabled ? 'Encrypted' : 'Not Encrypted'} {r.public_access ? '• PUBLIC' : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Score: {r.security_score}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Add Resource</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <select value={form.cloudProvider} onChange={e => setForm({...form, cloudProvider: e.target.value})} className="w-full bg-gray-700 rounded px-3 py-2 text-sm"><option value="aws">AWS</option><option value="azure">Azure</option><option value="gcp">GCP</option></select>
            <select value={form.resourceType} onChange={e => setForm({...form, resourceType: e.target.value})} className="w-full bg-gray-700 rounded px-3 py-2 text-sm"><option value="ec2">EC2</option><option value="s3">S3</option><option value="rds">RDS</option><option value="lambda">Lambda</option><option value="vpc">VPC</option><option value="iam">IAM</option></select>
            <input value={form.resourceName} onChange={e => setForm({...form, resourceName: e.target.value})} placeholder="Resource Name" className="w-full bg-gray-700 rounded px-3 py-2 text-sm" />
            <select value={form.region} onChange={e => setForm({...form, region: e.target.value})} className="w-full bg-gray-700 rounded px-3 py-2 text-sm"><option value="us-east-1">us-east-1</option><option value="us-west-2">us-west-2</option><option value="eu-west-1">eu-west-1</option><option value="ap-southeast-1">ap-southeast-1</option></select>
            <input value={form.costMonthly} onChange={e => setForm({...form, costMonthly: parseFloat(e.target.value) || 0})} type="number" step="0.01" placeholder="Monthly Cost $" className="w-full bg-gray-700 rounded px-3 py-2 text-sm" />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.encryptionEnabled} onChange={e => setForm({...form, encryptionEnabled: e.target.checked})} /> Encryption Enabled</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.publicAccess} onChange={e => setForm({...form, publicAccess: e.target.checked})} /> Public Access</label>
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm w-full">Add Resource</button>
          </form>
        </div>
      </div>
    </div>
  );
}
