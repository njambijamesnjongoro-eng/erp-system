import React, { useState, useEffect } from 'react';
import { fileSecurityApi } from '../../api/fileSecurity';

export function ClassificationManagement() {
  const [classifications, setClassifications] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({});

  useEffect(() => {
    fileSecurityApi.getClassifications().then(r => setClassifications(r.data.data)).catch(() => {});
  }, []);

  const startEdit = (c) => {
    setEditingId(c.id);
    setForm({ label: c.label, color: c.color, description: c.description, requiresWatermark: c.requires_watermark, isActive: c.is_active });
  };

  const handleSave = async (id) => {
    await fileSecurityApi.updateClassification(id, form);
    setEditingId(null);
    const res = await fileSecurityApi.getClassifications();
    setClassifications(res.data.data);
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Classification Management</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {classifications.map(c => (
          <div key={c.id} className="bg-gray-800 rounded-lg p-4 border-l-4" style={{ borderLeftColor: c.color }}>
            {editingId === c.id ? (
              <div className="space-y-2">
                <input value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} className="bg-gray-700 px-2 py-1 rounded text-sm w-full" />
                <div className="flex gap-2">
                  <input value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} className="bg-gray-700 px-2 py-1 rounded text-sm w-24" />
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.requiresWatermark} onChange={e => setForm(p => ({ ...p, requiresWatermark: e.target.checked }))} /> Watermark</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))} /> Active</label>
                </div>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="bg-gray-700 px-2 py-1 rounded text-sm w-full" rows={2} />
                <div className="flex gap-2">
                  <button onClick={() => handleSave(c.id)} className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-xs">Save</button>
                  <button onClick={() => setEditingId(null)} className="bg-gray-600 hover:bg-gray-500 px-3 py-1 rounded text-xs">Cancel</button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{c.label}</h3>
                    <p className="text-xs text-gray-400">{c.name}</p>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className={`px-2 py-0.5 rounded text-xs ${c.is_active ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>{c.is_active ? 'Active' : 'Inactive'}</span>
                    <button onClick={() => startEdit(c)} className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded">Edit</button>
                  </div>
                </div>
                <p className="text-sm mt-2 text-gray-300">{c.description}</p>
                <div className="flex gap-4 mt-2 text-xs text-gray-400">
                  <span>Watermark: {c.requires_watermark ? '✓' : '✗'}</span>
                  <span>Level: {c.max_access_level}</span>
                  <span>Roles: {(c.allowed_roles || []).length}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
