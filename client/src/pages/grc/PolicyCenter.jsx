import React, { useState, useEffect } from 'react';
import { grcApi } from '../../api/grc';

const policyTypes = ['hr', 'security', 'it', 'procurement', 'finance', 'data_privacy'];
const statuses = ['draft', 'pending_approval', 'published', 'retired'];

export function PolicyCenter() {
  const [policies, setPolicies] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [form, setForm] = useState({ title: '', description: '', policyType: 'security', category: '', department: '', scope: '', purpose: '', content: '' });

  useEffect(() => { fetchPolicies(); }, [filterType, filterStatus]);

  const fetchPolicies = () => {
    grcApi.getPolicies({ type: filterType || undefined, status: filterStatus || undefined, limit: 100 }).then(r => setPolicies(r.data.data?.data || [])).catch(() => {});
  };

  const handleCreate = async () => {
    await grcApi.createPolicy(form);
    setShowForm(false);
    setForm({ title: '', description: '', policyType: 'security', category: '', department: '', scope: '', purpose: '', content: '' });
    fetchPolicies();
  };

  const handleSelect = async (id) => {
    const r = await grcApi.getPolicy(id);
    setSelected(r.data.data);
  };

  const handlePublish = async (id) => {
    await grcApi.publishPolicy(id);
    fetchPolicies();
    if (selected?.policy_id === id) handleSelect(id);
  };

  const handleAck = async (id) => {
    try { await grcApi.acknowledgePolicy(id); alert('Acknowledged'); } catch (e) { alert(e.response?.data?.error || 'Already acknowledged'); }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Policy Management Center</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm">{showForm ? 'Cancel' : 'New Policy'}</button>
      </div>

      {showForm && (
        <div className="bg-gray-800 rounded-lg p-4 space-y-3">
          <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Policy Title" className="w-full bg-gray-700 px-3 py-2 rounded text-sm" />
          <div className="grid grid-cols-2 gap-3">
            <select value={form.policyType} onChange={e => setForm(p => ({ ...p, policyType: e.target.value }))} className="bg-gray-700 px-3 py-2 rounded text-sm">
              {policyTypes.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
            <input value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} placeholder="Department" className="bg-gray-700 px-3 py-2 rounded text-sm" />
          </div>
          <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Description" className="w-full bg-gray-700 px-3 py-2 rounded text-sm" rows={2} />
          <div className="grid grid-cols-2 gap-3">
            <textarea value={form.scope} onChange={e => setForm(p => ({ ...p, scope: e.target.value }))} placeholder="Scope" className="bg-gray-700 px-3 py-2 rounded text-sm" rows={2} />
            <textarea value={form.purpose} onChange={e => setForm(p => ({ ...p, purpose: e.target.value }))} placeholder="Purpose" className="bg-gray-700 px-3 py-2 rounded text-sm" rows={2} />
          </div>
          <textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} placeholder="Policy Content (full text)" className="w-full bg-gray-700 px-3 py-2 rounded text-sm font-mono" rows={6} />
          <button onClick={handleCreate} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-sm">Create Policy</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex gap-2 mb-3">
            <select value={filterType} onChange={e => setFilterType(e.target.value)} className="bg-gray-700 px-3 py-1.5 rounded text-sm">
              <option value="">All Types</option>{policyTypes.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-gray-700 px-3 py-1.5 rounded text-sm">
              <option value="">All Statuses</option>{statuses.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          {policies.length === 0 ? <p className="text-gray-500 text-sm">No policies</p> : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {policies.map(p => (
                <div key={p.id} onClick={() => handleSelect(p.policy_id)} className={`bg-gray-700 rounded p-3 text-sm cursor-pointer hover:bg-gray-600 ${selected?.policy_id === p.policy_id ? 'ring-1 ring-blue-500' : ''}`}>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{p.title}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${p.status === 'published' ? 'bg-green-900 text-green-300' : p.status === 'draft' ? 'bg-yellow-900 text-yellow-300' : 'bg-gray-600'}`}>{p.status}</span>
                  </div>
                  <div className="flex gap-2 mt-1 text-xs text-gray-400">
                    <span>{p.policy_type?.replace(/_/g, ' ')}</span>
                    <span>v{p.version}</span>
                    <span>{p.department}</span>
                    <span>{new Date(p.updated_at).toLocaleDateString()}</span>
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
                <span className={`text-xs px-2 py-0.5 rounded ${selected.status === 'published' ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'}`}>{selected.status}</span>
                <span className="ml-2 text-xs text-gray-400">{selected.policy_type} · v{selected.version}</span>
              </div>
              <div className="flex gap-2">
                {selected.status !== 'published' && <button onClick={() => handlePublish(selected.policy_id)} className="text-xs bg-green-700 hover:bg-green-600 px-2 py-1 rounded">Publish</button>}
                {selected.status === 'published' && <button onClick={() => handleAck(selected.policy_id)} className="text-xs bg-blue-700 hover:bg-blue-600 px-2 py-1 rounded">Acknowledge</button>}
              </div>
            </div>
            {selected.description && <p className="text-sm text-gray-300 mb-2">{selected.description}</p>}
            {selected.scope && <div className="mb-2"><span className="text-xs text-gray-400">Scope:</span><p className="text-sm">{selected.scope}</p></div>}
            {selected.purpose && <div className="mb-2"><span className="text-xs text-gray-400">Purpose:</span><p className="text-sm">{selected.purpose}</p></div>}
            {selected.content && <div className="mb-3"><span className="text-xs text-gray-400">Content:</span><pre className="text-sm bg-gray-900 rounded p-2 mt-1 whitespace-pre-wrap max-h-48 overflow-y-auto">{selected.content}</pre></div>}
            <div className="flex gap-3 text-xs text-gray-500"><span>Department: {selected.department}</span><span>Owner: {selected.owner_name}</span><span>Updated: {new Date(selected.updated_at).toLocaleString()}</span></div>

            {selected.versions?.length > 1 && (
              <div className="mt-4 border-t border-gray-700 pt-3">
                <h3 className="text-sm font-medium mb-2">Version History</h3>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {selected.versions.map(v => (
                    <div key={v.id} className="bg-gray-700 rounded p-2 text-xs flex justify-between">
                      <span>v{v.version}</span>
                      <span className="text-gray-400">{v.status}</span>
                      <span className="text-gray-500">{new Date(v.created_at).toLocaleString()}</span>
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
