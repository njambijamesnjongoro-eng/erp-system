import React, { useState, useEffect } from 'react';
import { phase9Api } from '../../api/phase9';

export function ExecutiveVault() {
  const [items, setItems] = useState({ rows: [], total: 0 });
  const [form, setForm] = useState({ title: '', description: '', itemType: 'contract', classification: 'confidential', content: '' });

  const load = () => { phase9Api.getVaultItems({ limit: 100 }).then(r => setItems(r.data.data)).catch(() => {}); };

  useEffect(() => { load(); }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    phase9Api.createVaultItem({ ...form, content: form.content }).then(() => {
      setForm({ title: '', description: '', itemType: 'contract', classification: 'confidential', content: '' });
      load();
    }).catch(() => {});
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Executive Vault</h1>
      <p className="text-sm text-gray-400">Encrypted storage for sensitive executive documents with approval-based access</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Vault Items ({items.total})</h2>
          {items.rows.map(i => (
            <div key={i.id} className="flex justify-between items-center p-3 bg-gray-750 rounded border border-gray-700 mb-2">
              <div>
                <div className="flex gap-2 items-center">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${i.classification === 'critical' ? 'bg-red-900 text-red-300' : i.classification === 'restricted' ? 'bg-orange-900 text-orange-300' : 'bg-yellow-900 text-yellow-300'}`}>{i.classification}</span>
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-900 text-blue-300">{i.item_type}</span>
                  <span className="text-sm font-medium">{i.title}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Owner: {i.owner_name} • Accessed: {i.access_count} times • {i.access_required_approval ? 'Approval Required' : 'Open Access'}
                </div>
              </div>
              <span className={`text-xs ${i.status === 'active' ? 'text-green-400' : 'text-gray-500'}`}>{i.status}</span>
            </div>
          ))}
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Store Item</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Title" className="w-full bg-gray-700 rounded px-3 py-2 text-sm" required />
            <select value={form.itemType} onChange={e => setForm({...form, itemType: e.target.value})} className="w-full bg-gray-700 rounded px-3 py-2 text-sm"><option value="contract">Contract</option><option value="executive_report">Executive Report</option><option value="strategic_doc">Strategic Doc</option><option value="board_doc">Board Doc</option><option value="financial_report">Financial Report</option></select>
            <select value={form.classification} onChange={e => setForm({...form, classification: e.target.value})} className="w-full bg-gray-700 rounded px-3 py-2 text-sm"><option value="confidential">Confidential</option><option value="restricted">Restricted</option><option value="critical">Critical</option></select>
            <textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})} placeholder="Content (encrypted at rest)" className="w-full bg-gray-700 rounded px-3 py-2 text-sm" rows={4} />
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm w-full">Encrypt & Store</button>
          </form>
        </div>
      </div>
    </div>
  );
}
