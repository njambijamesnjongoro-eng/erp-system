import { useState, useEffect } from 'react';
import { Plus, Search, MapPin, Box, Layers, X, Edit3, Building2, ChevronLeft, ChevronRight, Eye, Package } from 'lucide-react';
import { warehouseService } from '../../api/procurement';
import { formatDate } from '../../utils/helpers';
import { useAuth } from '../../hooks/useAuth';

const fmt = (n) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(n || 0);

export function WarehousesPage() {
  const { user } = useAuth();
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBinModal, setShowBinModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState('bins');
  const [bins, setBins] = useState([]);
  const [stock, setStock] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [binForm, setBinForm] = useState({});
  const [form, setForm] = useState({});
  const limit = 12;

  const fetch = async (p = page) => {
    setLoading(true);
    try {
      const { data } = await warehouseService.list({ page: p, limit, search });
      setWarehouses(data.data || []);
      setTotal(data.total || 0);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [page, search]);

  const openWarehouse = async (wh) => {
    setSelected(wh);
    setEditForm({ ...wh });
    setEditing(false);
    setTab('bins');
    try {
      const { data: b } = await warehouseService.getBins(wh.id);
      setBins(b.data || []);
      const { data: s } = await warehouseService.getStockByWarehouse(wh.id);
      setStock(s.data || []);
    } catch (err) { console.error(err); }
  };

  const handleCreate = async () => {
    try {
      await warehouseService.create(form);
      setShowAddModal(false);
      setForm({});
      fetch();
    } catch (err) { alert(err.response?.data?.message || err.message); }
  };

  const handleUpdate = async () => {
    try {
      await warehouseService.update(selected.id, editForm);
      setEditing(false);
      setSelected({ ...selected, ...editForm });
      fetch();
    } catch (err) { alert(err.response?.data?.message || err.message); }
  };

  const handleAddBin = async () => {
    try {
      await warehouseService.createBin(selected.id, binForm);
      setShowBinModal(false);
      setBinForm({});
      const { data: b } = await warehouseService.getBins(selected.id);
      setBins(b.data || []);
    } catch (err) { alert(err.response?.data?.message || err.message); }
  };

  const totalPages = Math.ceil(total / limit);

  if (loading && !warehouses.length) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Warehouses</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage warehouse locations and bins</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary gap-2"><Plus className="w-4 h-4" /> Add Warehouse</button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search warehouses..." className="input-field w-full pl-10" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {warehouses.map(wh => (
          <div key={wh.id} onClick={() => openWarehouse(wh)} className="card cursor-pointer hover:shadow-lg transition-shadow">
            <div className="card-body">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary-600" />
                  <h3 className="font-semibold">{wh.name}</h3>
                </div>
                <span className={`badge ${wh.is_active ? 'badge-emerald' : 'badge-gray'}`}>{wh.is_active ? 'Active' : 'Inactive'}</span>
              </div>
              <div className="space-y-1 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" />{wh.location}, {wh.city}</div>
                <div className="flex items-center gap-2"><Layers className="w-3.5 h-3.5" />Code: {wh.code || '-'}</div>
              </div>
              <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-1 text-sm"><Package className="w-3.5 h-3.5 text-blue-500" /><span className="font-medium">{wh.bin_count || 0}</span> Bins</div>
                <div className="flex items-center gap-1 text-sm"><Box className="w-3.5 h-3.5 text-amber-500" /><span className="font-medium">{wh.item_count || 0}</span> Items</div>
              </div>
            </div>
          </div>
        ))}
        {warehouses.length === 0 && !loading && <div className="col-span-full text-center text-gray-400 py-12">No warehouses found</div>}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="btn-secondary btn-sm"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary btn-sm"><ChevronRight className="w-4 h-4" /></button>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-bold">Add Warehouse</h3><button onClick={() => setShowAddModal(false)}><X className="w-5 h-5" /></button></div>
            <div className="space-y-4">
              <input placeholder="Warehouse Code" value={form.code||''} onChange={e => setForm({...form, code: e.target.value})} className="input-field w-full" />
              <input placeholder="Warehouse Name" value={form.name||''} onChange={e => setForm({...form, name: e.target.value})} className="input-field w-full" required />
              <input placeholder="Location" value={form.location||''} onChange={e => setForm({...form, location: e.target.value})} className="input-field w-full" />
              <input placeholder="Address" value={form.address||''} onChange={e => setForm({...form, address: e.target.value})} className="input-field w-full" />
              <input placeholder="City" value={form.city||''} onChange={e => setForm({...form, city: e.target.value})} className="input-field w-full" />
              <input type="number" placeholder="Max Capacity" value={form.capacity||''} onChange={e => setForm({...form, capacity: parseInt(e.target.value)})} className="input-field w-full" />
              <textarea placeholder="Notes" value={form.notes||''} onChange={e => setForm({...form, notes: e.target.value})} className="input-field w-full" rows={2} />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowAddModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleCreate} className="btn-primary">Create Warehouse</button>
            </div>
          </div>
        </div>
      )}

      {showBinModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowBinModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-bold">Add Bin</h3><button onClick={() => setShowBinModal(false)}><X className="w-5 h-5" /></button></div>
            <div className="space-y-4">
              <input placeholder="Bin Code" value={binForm.bin_code||''} onChange={e => setBinForm({...binForm, bin_code: e.target.value})} className="input-field w-full" required />
              <input placeholder="Bin Name" value={binForm.name||''} onChange={e => setBinForm({...binForm, name: e.target.value})} className="input-field w-full" required />
              <input type="number" placeholder="Max Capacity" value={binForm.max_capacity||''} onChange={e => setBinForm({...binForm, max_capacity: parseInt(e.target.value)})} className="input-field w-full" />
              <textarea placeholder="Description" value={binForm.description||''} onChange={e => setBinForm({...binForm, description: e.target.value})} className="input-field w-full" rows={2} />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowBinModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleAddBin} className="btn-primary">Add Bin</button>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40" onClick={() => setSelected(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-4xl mx-4 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <Building2 className="w-6 h-6 text-primary-600" />
                <div>
                  <h2 className="text-xl font-bold">{selected.name}</h2>
                  <p className="text-sm text-gray-500">{selected.code} &middot; {selected.location}, {selected.city}</p>
                </div>
              </div>
              <div className="flex gap-2">
                {!editing ? (
                  <button onClick={() => setEditing(true)} className="btn-secondary btn-sm gap-1"><Edit3 className="w-4 h-4" /> Edit</button>
                ) : (
                  <>
                    <button onClick={() => { setEditing(false); setEditForm({...selected}); }} className="btn-secondary btn-sm">Cancel</button>
                    <button onClick={handleUpdate} className="btn-primary btn-sm">Save</button>
                  </>
                )}
                <button onClick={() => setSelected(null)} className="btn-secondary btn-sm"><X className="w-4 h-4" /></button>
              </div>
            </div>

            {editing && (
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h4 className="font-semibold mb-3">Edit Warehouse</h4>
                <div className="grid grid-cols-2 gap-4">
                  <input placeholder="Code" value={editForm.code||''} onChange={e => setEditForm({...editForm, code: e.target.value})} className="input-field w-full" />
                  <input placeholder="Name" value={editForm.name||''} onChange={e => setEditForm({...editForm, name: e.target.value})} className="input-field w-full" />
                  <input placeholder="Location" value={editForm.location||''} onChange={e => setEditForm({...editForm, location: e.target.value})} className="input-field w-full" />
                  <input placeholder="City" value={editForm.city||''} onChange={e => setEditForm({...editForm, city: e.target.value})} className="input-field w-full" />
                  <input placeholder="Address" value={editForm.address||''} onChange={e => setEditForm({...editForm, address: e.target.value})} className="input-field w-full col-span-2" />
                  <input type="number" placeholder="Capacity" value={editForm.capacity||''} onChange={e => setEditForm({...editForm, capacity: parseInt(e.target.value)})} className="input-field w-full" />
                  <textarea placeholder="Notes" value={editForm.notes||''} onChange={e => setEditForm({...editForm, notes: e.target.value})} className="input-field w-full col-span-2" rows={2} />
                </div>
              </div>
            )}

            <div className="flex border-b border-gray-200 dark:border-gray-700">
              <button onClick={() => setTab('bins')} className={`px-6 py-3 text-sm font-medium border-b-2 ${tab === 'bins' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Bins</button>
              <button onClick={() => setTab('stock')} className={`px-6 py-3 text-sm font-medium border-b-2 ${tab === 'stock' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Stock</button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {tab === 'bins' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold">Bins ({bins.length})</h4>
                    <button onClick={() => { setBinForm({}); setShowBinModal(true); }} className="btn-primary btn-sm gap-1"><Plus className="w-4 h-4" /> Add Bin</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="data-table text-sm">
                      <thead><tr><th>Bin Code</th><th>Name</th><th>Max Capacity</th><th>Status</th></tr></thead>
                      <tbody>
                        {bins.map(b => (
                          <tr key={b.id}>
                            <td className="font-mono">{b.bin_code}</td>
                            <td>{b.name}</td>
                            <td>{b.max_capacity ?? '-'}</td>
                            <td><span className={`badge ${b.is_active ? 'badge-emerald' : 'badge-gray'}`}>{b.is_active ? 'Active' : 'Inactive'}</span></td>
                          </tr>
                        ))}
                        {bins.length === 0 && <tr><td colSpan={4} className="text-center text-gray-400 py-6">No bins found</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {tab === 'stock' && (
                <div>
                  <h4 className="font-semibold mb-4">Stock Items ({stock.length})</h4>
                  <div className="overflow-x-auto">
                    <table className="data-table text-sm">
                      <thead><tr><th>Item</th><th>SKU</th><th>Quantity</th></tr></thead>
                      <tbody>
                        {stock.map(s => (
                          <tr key={s.id}>
                            <td className="font-medium">{s.item_name || s.name}</td>
                            <td className="font-mono">{s.sku || '-'}</td>
                            <td>{s.quantity ?? 0}</td>
                          </tr>
                        ))}
                        {stock.length === 0 && <tr><td colSpan={3} className="text-center text-gray-400 py-6">No stock items in this warehouse</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
