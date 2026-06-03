import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Package, MapPin, User, AlertTriangle } from 'lucide-react';
import { assetService } from '../../api/assets';
import { formatCurrency, formatDate, getStatusColor } from '../../utils/helpers';
import { useAuth } from '../../hooks/useAuth';

export function AssetDirectory() {
  const { hasRole } = useAuth();
  const canManage = hasRole('System Admin', 'CEO', 'Asset Manager');
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({});

  const fetch = async (params = {}) => {
    setLoading(true);
    try {
      const { data } = await assetService.list(params);
      setAssets(data.data || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetch({ status: statusFilter || undefined }); }, [statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => fetch({ search: search || undefined, status: statusFilter || undefined }), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await assetService.getCategories();
        setCategories(data.data || []);
      } catch (err) { /* ignore */ }
    })();
  }, []);

  const handleCreate = async () => {
    try {
      await assetService.create(form);
      setShowModal(false);
      setForm({});
      fetch();
    } catch (err) { alert(err.response?.data?.message || err.message); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Asset Directory</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{assets.length} assets registered</p>
        </div>
        {canManage && <button onClick={() => setShowModal(true)} className="btn-primary gap-2"><Plus className="w-4 h-4" /> Register Asset</button>}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search by name, tag, serial..." value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-10" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field w-auto">
          <option value="">All Status</option>
          <option value="available">Available</option>
          <option value="assigned">Assigned</option>
          <option value="in_maintenance">In Maintenance</option>
          <option value="disposed">Disposed</option>
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {assets.map(a => (
          <Link key={a.id} to={`/assets/${a.id}`} className="card hover:shadow-lg transition-shadow">
            <div className="card-body">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Package className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <p className="font-medium truncate">{a.asset_name}</p>
                </div>
                <span className={`badge badge-${getStatusColor(a.status)} flex-shrink-0`}>{a.status}</span>
              </div>
              <div className="space-y-1 text-sm text-gray-500">
                <p className="font-mono text-xs">{a.asset_code} · {a.asset_tag}</p>
                <p className="truncate"><MapPin className="w-3 h-3 inline mr-1" />{a.location || a.department_name || 'No location'}</p>
                {a.assigned_name && <p className="truncate"><User className="w-3 h-3 inline mr-1" />{a.assigned_name}</p>}
                <div className="flex justify-between pt-1 border-t mt-2">
                  <span className="font-mono text-xs">{a.category_name}</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(a.current_value)}</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {assets.length === 0 && !loading && (
        <div className="text-center py-16 text-gray-400">
          <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg">No assets found</p>
          <p className="text-sm">Register your first asset to get started</p>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Register New Asset</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><input placeholder="Asset Name *" value={form.asset_name||''} onChange={e => setForm({...form, asset_name: e.target.value})} className="input-field w-full" required /></div>
              <select value={form.category_id||''} onChange={e => setForm({...form, category_id: e.target.value})} className="input-field">
                <option value="">Category *</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.category_name}</option>)}
              </select>
              <input placeholder="Serial Number" value={form.serial_number||''} onChange={e => setForm({...form, serial_number: e.target.value})} className="input-field" />
              <input placeholder="Model Number" value={form.model_number||''} onChange={e => setForm({...form, model_number: e.target.value})} className="input-field" />
              <input placeholder="Manufacturer" value={form.manufacturer||''} onChange={e => setForm({...form, manufacturer: e.target.value})} className="input-field" />
              <div><label className="block text-xs mb-1">Purchase Date</label><input type="date" value={form.purchase_date||''} onChange={e => setForm({...form, purchase_date: e.target.value})} className="input-field w-full" /></div>
              <input type="number" step="0.01" placeholder="Purchase Cost" value={form.purchase_cost||''} onChange={e => setForm({...form, purchase_cost: parseFloat(e.target.value)})} className="input-field" />
              <input type="number" step="0.01" placeholder="Residual Value" value={form.residual_value||''} onChange={e => setForm({...form, residual_value: parseFloat(e.target.value)})} className="input-field" />
              <select value={form.depreciation_method||'straight_line'} onChange={e => setForm({...form, depreciation_method: e.target.value})} className="input-field">
                <option value="straight_line">Straight Line</option>
                <option value="declining_balance">Declining Balance</option>
              </select>
              <input type="number" placeholder="Useful Life (years)" value={form.useful_life_years||5} onChange={e => setForm({...form, useful_life_years: parseInt(e.target.value)})} className="input-field" />
              <div><label className="block text-xs mb-1">Warranty Expiry</label><input type="date" value={form.warranty_expiry||''} onChange={e => setForm({...form, warranty_expiry: e.target.value})} className="input-field w-full" /></div>
              <input placeholder="Location" value={form.location||''} onChange={e => setForm({...form, location: e.target.value})} className="input-field" />
              <input placeholder="Condition (new/good/fair/poor)" value={form.condition||'new'} onChange={e => setForm({...form, condition: e.target.value})} className="input-field" />
              <div className="col-span-2"><textarea placeholder="Notes" value={form.notes||''} onChange={e => setForm({...form, notes: e.target.value})} className="input-field w-full" rows={2} /></div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleCreate} className="btn-primary">Register Asset</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
