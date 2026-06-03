import { useState, useEffect } from 'react';
import { Shield, Plus, Search, Edit3, X, Loader2, Check, Users } from 'lucide-react';
import api from '../../api/axios';

export function RolesPage() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [perms, setPerms] = useState([]);
  const [selectedPerms, setSelectedPerms] = useState([]);

  const fetch = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/roles');
      setRoles(data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const fetchPermissions = async (roleId) => {
    try {
      const { data } = await api.get(`/roles/${roleId}`);
      setPerms(data.data?.permissions || []);
      setSelectedPerms((data.data?.permissions || []).map(p => p.id));
    } catch (e) {
      console.error(e);
    }
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', description: '' });
    setPerms([]);
    setSelectedPerms([]);
    setShowModal(true);
  };

  const openEdit = async (r) => {
    setEditing(r);
    setForm({ name: r.name, description: r.description || '' });
    await fetchPermissions(r.id);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    try {
      if (editing) {
        await api.put(`/roles/${editing.id}`, form);
        if (selectedPerms.length > 0) {
          await api.put(`/roles/${editing.id}/permissions`, { permissionIds: selectedPerms });
        }
      } else {
        const res = await api.post('/roles', form);
        if (res.data?.data?.id && selectedPerms.length > 0) {
          await api.put(`/roles/${res.data.data.id}/permissions`, { permissionIds: selectedPerms });
        }
      }
      setShowModal(false);
      fetch();
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this role?')) return;
    try {
      await api.delete(`/roles/${id}`);
      fetch();
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    }
  };

  const togglePerm = (permId) => {
    setSelectedPerms(prev =>
      prev.includes(permId) ? prev.filter(id => id !== permId) : [...prev, permId]
    );
  };

  const filtered = roles.filter(r =>
    !search || r.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary-600" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Roles</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{roles.length} roles</p>
        </div>
        <button onClick={openAdd} className="btn-primary gap-2"><Plus className="w-4 h-4" /> Add Role</button>
      </div>

      <div className="card">
        <div className="card-body p-0">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search roles..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10 w-full" />
            </div>
          </div>
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">No roles found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Users</th>
                    <th>Type</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id}>
                      <td className="font-medium text-gray-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-primary-600" />
                          {r.name}
                        </div>
                      </td>
                      <td className="text-sm text-gray-600 dark:text-gray-400">{r.description || '-'}</td>
                      <td className="text-sm text-gray-600 dark:text-gray-400">{r.user_count || 0}</td>
                      <td>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${r.is_system ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                          {r.is_system ? 'System' : 'Custom'}
                        </span>
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(r)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500" title="Edit"><Edit3 className="w-4 h-4" /></button>
                          {!r.is_system && (
                            <button onClick={() => handleDelete(r.id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-red-500" title="Delete"><X className="w-4 h-4" /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{editing ? 'Edit Role' : 'Add Role'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                <input type="text" placeholder="e.g. Supervisor" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="input-field w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea placeholder="Role description" value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} className="input-field w-full" rows={2} />
              </div>
              {editing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Permissions</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    {perms.length === 0 ? (
                      <p className="text-sm text-gray-400 col-span-full">No permissions available</p>
                    ) : (
                      perms.map((p) => (
                        <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-1.5 rounded">
                          <input type="checkbox" checked={selectedPerms.includes(p.id)} onChange={() => togglePerm(p.id)} className="rounded border-gray-300" />
                          <span className="text-gray-700 dark:text-gray-300">{p.resource}: {p.action}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} className="btn-primary">{editing ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
