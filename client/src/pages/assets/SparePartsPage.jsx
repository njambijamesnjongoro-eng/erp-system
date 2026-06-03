import { useState, useEffect } from 'react';
import { Plus, Package, AlertTriangle, Search, Minus, Plus as PlusIcon } from 'lucide-react';
import { sparePartService } from '../../api/assets';
import { formatCurrency, getStatusColor } from '../../utils/helpers';
import { useAuth } from '../../hooks/useAuth';

export function SparePartsPage() {
  const { hasRole } = useAuth();
  const canManage = hasRole('System Admin', 'CEO', 'Asset Manager', 'Procurement Officer');
  const [parts, setParts] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [form, setForm] = useState({});
  const [selectedPart, setSelectedPart] = useState('');

  const fetch = async () => {
    setLoading(true);
    try {
      const [pRes, lRes] = await Promise.all([sparePartService.list(), sparePartService.getLowStock()]);
      setParts(pRes.data.data || []);
      setLowStock(lRes.data.data || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const handleCreate = async () => {
    try { await sparePartService.create(form); setShowModal(false); setForm({}); fetch(); } catch (err) { alert(err.response?.data?.message || err.message); }
  };

  const handleStock = async () => {
    try {
      if (modalType === 'stock-in') await sparePartService.addStock(selectedPart, form);
      else await sparePartService.removeStock(selectedPart, form);
      setShowModal(false); setForm({}); fetch();
    } catch (err) { alert(err.response?.data?.message || err.message); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Spare Parts Inventory</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {lowStock.length > 0 && <span className="text-red-500 font-medium">{lowStock.length} low stock alerts • </span>}
            {parts.length} parts
          </p>
        </div>
        <div className="flex gap-2">
          {canManage && <button onClick={() => { setModalType('part'); setShowModal(true); }} className="btn-primary gap-2"><Plus className="w-4 h-4" /> New Part</button>}
          {canManage && parts.length > 0 && (
            <>
              <button onClick={() => { setModalType('stock-in'); setShowModal(true); }} className="btn-secondary gap-2"><PlusIcon className="w-4 h-4" /> Stock In</button>
              <button onClick={() => { setModalType('stock-out'); setShowModal(true); }} className="btn-secondary gap-2"><Minus className="w-4 h-4" /> Stock Out</button>
            </>
          )}
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2"><AlertTriangle className="w-5 h-5 text-red-500" /><span className="font-medium text-red-700 dark:text-red-300">Low Stock Alerts</span></div>
          <div className="space-y-1">{lowStock.map(s => (
            <p key={s.id} className="text-sm text-red-600">• {s.part_name} — {s.quantity_in_stock} left (reorder at {s.reorder_level}) <span className="text-red-400">shortfall: {s.shortfall}</span></p>
          ))}</div>
        </div>
      )}

      <div className="card"><div className="card-body overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>Code</th><th>Part Name</th><th>Category</th><th>In Stock</th><th>Unit Cost</th><th>Total Value</th><th>Reorder</th><th>Status</th></tr></thead>
          <tbody>
            {parts.map(p => {
              const isLow = p.quantity_in_stock <= p.reorder_level;
              return (
                <tr key={p.id} className={isLow ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                  <td className="font-mono text-xs">{p.part_code}</td>
                  <td className="font-medium">{p.part_name}</td>
                  <td><span className="badge badge-indigo text-xs">{p.category}</span></td>
                  <td className={`font-bold text-lg ${isLow ? 'text-red-500' : 'text-green-500'}`}>{p.quantity_in_stock}</td>
                  <td>{formatCurrency(p.unit_cost)}</td>
                  <td className="font-medium">{formatCurrency(p.quantity_in_stock * p.unit_cost)}</td>
                  <td className="text-sm">{p.reorder_level}</td>
                  <td>{p.is_active ? <span className="badge badge-emerald">Active</span> : <span className="badge badge-gray">Inactive</span>}</td>
                </tr>
              );
            })}
            {parts.length === 0 && <tr><td colSpan={8} className="text-center text-gray-400 py-8">No spare parts</td></tr>}
          </tbody>
        </table>
      </div></div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4 capitalize">{modalType === 'part' ? 'New Spare Part' : modalType === 'stock-in' ? 'Add Stock' : 'Remove Stock'}</h3>
            <div className="space-y-4">
              {modalType === 'part' ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <input placeholder="Part Name *" value={form.part_name||''} onChange={e => setForm({...form, part_name: e.target.value})} className="input-field" required />
                    <input placeholder="Part Code" value={form.part_code||''} onChange={e => setForm({...form, part_code: e.target.value})} className="input-field" />
                    <select value={form.category||''} onChange={e => setForm({...form, category: e.target.value})} className="input-field"><option value="">Category</option><option value="Engine">Engine</option><option value="Electrical">Electrical</option><option value="Brakes">Brakes</option><option value="Suspension">Suspension</option><option value="Body">Body</option><option value="Filters">Filters</option><option value="Other">Other</option></select>
                    <select value={form.unit_of_measure||'each'} onChange={e => setForm({...form, unit_of_measure: e.target.value})} className="input-field"><option value="each">Each</option><option value="liter">Liter</option><option value="kg">Kg</option><option value="meter">Meter</option></select>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <input type="number" placeholder="Stock" value={form.quantity_in_stock||0} onChange={e => setForm({...form, quantity_in_stock: parseInt(e.target.value)})} className="input-field" />
                    <input type="number" step="0.01" placeholder="Unit Cost" value={form.unit_cost||''} onChange={e => setForm({...form, unit_cost: parseFloat(e.target.value)})} className="input-field" />
                    <input type="number" placeholder="Reorder At" value={form.reorder_level||0} onChange={e => setForm({...form, reorder_level: parseInt(e.target.value)})} className="input-field" />
                  </div>
                  <input placeholder="Location (shelf/rack)" value={form.location||''} onChange={e => setForm({...form, location: e.target.value})} className="input-field w-full" />
                </>
              ) : (
                <>
                  <select value={selectedPart} onChange={e => setSelectedPart(e.target.value)} className="input-field w-full" required>
                    <option value="">Select Part</option>{parts.map(p => <option key={p.id} value={p.id}>{p.part_name} ({p.quantity_in_stock} in stock)</option>)}
                  </select>
                  <input type="number" placeholder="Quantity" value={form.quantity||''} onChange={e => setForm({...form, quantity: parseInt(e.target.value)})} className="input-field w-full" required />
                  {modalType === 'stock-in' && <input type="number" step="0.01" placeholder="Unit Cost (optional)" value={form.unit_cost||''} onChange={e => setForm({...form, unit_cost: parseFloat(e.target.value)})} className="input-field w-full" />}
                  <textarea placeholder="Notes" value={form.notes||''} onChange={e => setForm({...form, notes: e.target.value})} className="input-field w-full" rows={2} />
                </>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={modalType === 'part' ? handleCreate : handleStock} className="btn-primary">
                {modalType === 'stock-in' ? 'Add Stock' : modalType === 'stock-out' ? 'Remove Stock' : 'Create Part'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
