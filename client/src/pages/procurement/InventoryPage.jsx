import { useState, useEffect } from 'react';
import { Package, Plus, Search, ArrowUpDown, AlertTriangle, Box, Warehouse, DollarSign, X, Edit3, ChevronLeft, ChevronRight, History } from 'lucide-react';
import { inventoryService, warehouseService, supplierService } from '../../api/procurement';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { useAuth } from '../../hooks/useAuth';

export function InventoryPage() {
  const { hasRole } = useAuth();
  const canManage = hasRole('System Admin', 'CEO', 'Procurement Officer', 'Warehouse Manager');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [categories, setCategories] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [stats, setStats] = useState({ totalItems: 0, totalValue: 0, lowStock: 0, outOfStock: 0 });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [movements, setMovements] = useState([]);
  const [form, setForm] = useState({});
  const [movementForm, setMovementForm] = useState({});
  const [warehouseBins, setWarehouseBins] = useState({});
  const [itemSearch, setItemSearch] = useState('');

  const fetch = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (categoryFilter) params.category = categoryFilter;
      if (warehouseFilter) params.warehouseId = warehouseFilter;
      if (lowStockOnly) params.lowStock = true;
      const { data } = await inventoryService.list(params);
      setItems(data.data || []);
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchStats = async () => {
    try {
      const [valRes, lowRes] = await Promise.all([
        inventoryService.getStockValue().catch(() => ({ data: {} })),
        inventoryService.getLowStock().catch(() => ({ data: {} })),
      ]);
      const totalItems = items.reduce((s, i) => s + (i.current_qty || 0), 0);
      setStats({
        totalItems: items.length,
        totalValue: valRes.data?.totalValue || valRes.data?.total_value || 0,
        lowStock: (lowRes.data?.data || lowRes.data || []).filter((i) => (i.current_qty || 0) > 0 && (i.current_qty || 0) <= (i.reorder_point || 0)).length,
        outOfStock: (lowRes.data?.data || lowRes.data || []).filter((i) => (i.current_qty || 0) === 0).length,
      });
    } catch (err) { /* ignore */ }
  };

  const fetchCategories = async () => {
    try {
      const { data } = await inventoryService.getCategories();
      setCategories(data.data || []);
    } catch (err) { /* ignore */ }
  };

  const fetchWarehouses = async () => {
    try {
      const { data } = await warehouseService.list();
      setWarehouses(data.data || []);
    } catch (err) { /* ignore */ }
  };

  const fetchSuppliers = async () => {
    try {
      const { data } = await supplierService.list({ status: 'active' });
      setSuppliers(data.data || []);
    } catch (err) { /* ignore */ }
  };

  useEffect(() => { fetch(); }, [categoryFilter, warehouseFilter, lowStockOnly]);
  useEffect(() => { const timer = setTimeout(() => fetch(), 300); return () => clearTimeout(timer); }, [search]);
  useEffect(() => { fetchCategories(); fetchWarehouses(); fetchSuppliers(); }, []);

  const fetchBins = async (whId) => {
    if (!whId) return;
    try {
      const { data } = await warehouseService.getBins(whId);
      setWarehouseBins((prev) => ({ ...prev, [whId]: data.data || [] }));
    } catch (err) { /* ignore */ }
  };

  const openDetail = async (item) => {
    setSelectedItem(item);
    setShowDetail(true);
    try {
      const { data } = await inventoryService.getMovements(item.id);
      setMovements(data.data || []);
    } catch (err) { setMovements([]); }
  };

  const handleAddItem = async () => {
    try {
      await inventoryService.create(form);
      setShowAddModal(false);
      setForm({});
      fetch();
    } catch (err) { alert(err.response?.data?.message || err.message); }
  };

  const handleRecordMovement = async () => {
    try {
      await inventoryService.recordMovement(movementForm);
      setShowMovementModal(false);
      setMovementForm({});
      fetch();
      if (selectedItem && movementForm.item_id === selectedItem.id) {
        const { data } = await inventoryService.getMovements(selectedItem.id);
        setMovements(data.data || []);
        const { data: itemData } = await inventoryService.getById(selectedItem.id);
        setSelectedItem(itemData);
      }
    } catch (err) { alert(err.response?.data?.message || err.message); }
  };

  const getStatusInfo = (item) => {
    const qty = item.current_qty || 0;
    const reorder = item.reorder_point || 0;
    if (qty <= 0) return { label: 'Out of Stock', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
    if (qty <= reorder) return { label: 'Low Stock', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' };
    return { label: 'OK', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' };
  };

  if (loading && items.length === 0) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Inventory Management</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{pagination.total} items</p>
        </div>
        <div className="flex gap-2">
          {canManage && <button onClick={() => setShowAddModal(true)} className="btn-primary gap-2"><Plus className="w-4 h-4" /> Add Item</button>}
          {canManage && <button onClick={() => setShowMovementModal(true)} className="btn-secondary gap-2"><ArrowUpDown className="w-4 h-4" /> Record Movement</button>}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="card-body text-center">
            <p className="text-2xl font-bold">{stats.totalItems}</p>
            <p className="text-xs text-gray-500">Total Items</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body text-center">
            <p className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</p>
            <p className="text-xs text-gray-500">Total Stock Value</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body text-center">
            <p className="text-2xl font-bold text-amber-600">{stats.lowStock}</p>
            <p className="text-xs text-gray-500">Low Stock Items</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body text-center">
            <p className="text-2xl font-bold text-red-600">{stats.outOfStock}</p>
            <p className="text-xs text-gray-500">Out of Stock</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search by name or code..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" />
            </div>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="input-field w-auto min-w-[160px]">
              <option value="">All Categories</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.category_name || c.name || c}</option>)}
            </select>
            <select value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)} className="input-field w-auto min-w-[160px]">
              <option value="">All Warehouses</option>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.warehouse_name || w.name}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={lowStockOnly} onChange={(e) => setLowStockOnly(e.target.checked)} className="rounded" />
              Low Stock Only
            </label>
          </div>

          {items.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">No inventory items found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Item Code</th>
                    <th>Item Name</th>
                    <th>Category</th>
                    <th>Warehouse</th>
                    <th className="text-center">Current Qty</th>
                    <th className="text-right">Unit Cost</th>
                    <th className="text-right">Total Value</th>
                    <th className="text-center">Reorder Point</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const status = getStatusInfo(item);
                    const isLow = (item.current_qty || 0) <= (item.reorder_point || 0) && (item.current_qty || 0) > 0;
                    return (
                      <tr key={item.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 ${selectedItem?.id === item.id ? 'bg-primary-50 dark:bg-primary-900/10' : ''}`}>
                        <td className="font-mono text-sm">{item.item_code || item.sku || '-'}</td>
                        <td className="font-medium">
                          <span className="flex items-center gap-1">
                            {item.item_name || item.name}
                            {isLow && <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" title="Low Stock" />}
                            {(item.current_qty || 0) <= 0 && <AlertTriangle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" title="Out of Stock" />}
                          </span>
                        </td>
                        <td className="text-sm"><span className="badge badge-indigo">{item.category_name || item.category || '-'}</span></td>
                        <td className="text-sm">{item.warehouse_name || item.warehouse || '-'}</td>
                        <td className="text-center font-mono text-sm">{item.current_qty || 0}</td>
                        <td className="text-right font-mono text-sm">{formatCurrency(item.unit_cost)}</td>
                        <td className="text-right font-mono text-sm">{formatCurrency((item.current_qty || 0) * (item.unit_cost || 0))}</td>
                        <td className="text-center text-sm">{item.reorder_point || 0}</td>
                        <td><span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>{status.label}</span></td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => openDetail(item)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg" title="View"><Package className="w-4 h-4" /></button>
                            {canManage && <button onClick={() => { setForm(item); setShowAddModal(true); }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg" title="Edit"><Edit3 className="w-4 h-4" /></button>}
                            <button onClick={() => { setMovementForm({ item_id: item.id }); setShowMovementModal(true); }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg" title="Record Movement"><ArrowUpDown className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
              <p className="text-sm text-gray-400">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
              </p>
              <div className="flex gap-2">
                <button disabled={!pagination.hasPrev} onClick={() => fetch(pagination.page - 1)} className="btn-secondary text-sm disabled:opacity-50">Previous</button>
                <button disabled={!pagination.hasNext} onClick={() => fetch(pagination.page + 1)} className="btn-secondary text-sm disabled:opacity-50">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showDetail && selectedItem && (
        <div className="card">
          <div className="card-body">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold">{selectedItem.item_name || selectedItem.name}</h2>
                <p className="text-sm text-gray-500 font-mono">{selectedItem.item_code || selectedItem.sku || '-'}</p>
              </div>
              <button onClick={() => { setShowDetail(false); setSelectedItem(null); }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><X className="w-4 h-4" /></button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div><span className="text-xs text-gray-400">Category</span><p className="font-medium">{selectedItem.category_name || selectedItem.category || '-'}</p></div>
              <div><span className="text-xs text-gray-400">Warehouse</span><p className="font-medium">{selectedItem.warehouse_name || selectedItem.warehouse || '-'}</p></div>
              <div><span className="text-xs text-gray-400">Current Qty</span><p className="font-mono text-lg font-bold">{selectedItem.current_qty || 0}</p></div>
              <div><span className="text-xs text-gray-400">Unit Cost</span><p className="font-mono">{formatCurrency(selectedItem.unit_cost)}</p></div>
              <div><span className="text-xs text-gray-400">Min Qty</span><p>{selectedItem.minimum_qty || '-'}</p></div>
              <div><span className="text-xs text-gray-400">Max Qty</span><p>{selectedItem.maximum_qty || '-'}</p></div>
              <div><span className="text-xs text-gray-400">Reorder Point</span><p className={selectedItem.current_qty <= selectedItem.reorder_point ? 'text-red-600 font-semibold' : ''}>{selectedItem.reorder_point || 0}</p></div>
              <div><span className="text-xs text-gray-400">Reorder Qty</span><p>{selectedItem.reorder_qty || '-'}</p></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
              {selectedItem.batch_number && <div><span className="text-xs text-gray-400">Batch#</span><p className="font-mono">{selectedItem.batch_number}</p></div>}
              {selectedItem.expiry_date && <div><span className="text-xs text-gray-400">Expiry</span><p>{formatDate(selectedItem.expiry_date)}</p></div>}
              {selectedItem.supplier_name && <div><span className="text-xs text-gray-400">Supplier</span><p>{selectedItem.supplier_name}</p></div>}
              {selectedItem.notes && <div className="col-span-2"><span className="text-xs text-gray-400">Notes</span><p className="text-sm">{selectedItem.notes}</p></div>}
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><History className="w-4 h-4" /> Stock Movement History</h3>
              {movements.length === 0 ? (
                <p className="text-sm text-gray-400">No movements recorded yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr><th>Date</th><th>Type</th><th>Qty</th><th>Reference</th><th>From/To</th><th>Notes</th></tr>
                    </thead>
                    <tbody>
                      {movements.map((m) => (
                        <tr key={m.id}>
                          <td className="text-sm">{formatDate(m.created_at || m.date)}</td>
                          <td>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              m.movement_type === 'in' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                              m.movement_type === 'out' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                              m.movement_type === 'transfer' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                              'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                            }`}>{m.movement_type}</span>
                          </td>
                          <td className="font-mono text-sm">{m.quantity}</td>
                          <td className="text-sm">{m.reference_type || '-'} {m.reference_id ? `#${m.reference_id}` : ''}</td>
                          <td className="text-sm">{m.from_warehouse_name || m.to_warehouse_name || '-'}</td>
                          <td className="text-sm max-w-[200px] truncate">{m.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="mt-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-gray-400">Current Stock Level</span>
                <span className="text-sm font-semibold">{selectedItem.current_qty || 0}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                <div className="bg-primary-600 h-2.5 rounded-full" style={{ width: `${Math.min(((selectedItem.current_qty || 0) / ((selectedItem.maximum_qty || selectedItem.current_qty || 1) || 1)) * 100, 100)}%` }} />
              </div>
              {selectedItem.maximum_qty && <p className="text-xs text-gray-400 mt-1">Max: {selectedItem.maximum_qty}</p>}
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">{form.id ? 'Edit Item' : 'Add Inventory Item'}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><input placeholder="Item Name *" value={form.item_name || form.name || ''} onChange={(e) => setForm({...form, item_name: e.target.value})} className="input-field w-full" /></div>
              <select value={form.category_id || ''} onChange={(e) => setForm({...form, category_id: e.target.value})} className="input-field">
                <option value="">Category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.category_name || c.name}</option>)}
              </select>
              <select value={form.unit_of_measure || form.uom || ''} onChange={(e) => setForm({...form, unit_of_measure: e.target.value})} className="input-field">
                <option value="">Unit of Measure</option>
                <option value="pcs">Pieces (pcs)</option>
                <option value="kg">Kilograms (kg)</option>
                <option value="liters">Liters</option>
                <option value="boxes">Boxes</option>
                <option value="reams">Reams</option>
                <option value="rolls">Rolls</option>
              </select>
              <select value={form.warehouse_id || ''} onChange={(e) => { setForm({...form, warehouse_id: e.target.value, bin_id: '' }); fetchBins(e.target.value); }} className="input-field">
                <option value="">Warehouse</option>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.warehouse_name || w.name}</option>)}
              </select>
              <select value={form.bin_id || ''} onChange={(e) => setForm({...form, bin_id: e.target.value})} className="input-field">
                <option value="">Bin Location</option>
                {(warehouseBins[form.warehouse_id] || []).map((b) => <option key={b.id} value={b.id}>{b.bin_name || b.name || b.bin_code}</option>)}
              </select>
              <input type="number" step="0.01" placeholder="Unit Cost" value={form.unit_cost || ''} onChange={(e) => setForm({...form, unit_cost: parseFloat(e.target.value)})} className="input-field" />
              <select value={form.supplier_id || ''} onChange={(e) => setForm({...form, supplier_id: e.target.value})} className="input-field">
                <option value="">Preferred Supplier</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.supplier_name || s.name}</option>)}
              </select>
              <input type="number" placeholder="Minimum Qty" value={form.minimum_qty || ''} onChange={(e) => setForm({...form, minimum_qty: parseInt(e.target.value)})} className="input-field" />
              <input type="number" placeholder="Maximum Qty" value={form.maximum_qty || ''} onChange={(e) => setForm({...form, maximum_qty: parseInt(e.target.value)})} className="input-field" />
              <input type="number" placeholder="Reorder Point" value={form.reorder_point || ''} onChange={(e) => setForm({...form, reorder_point: parseInt(e.target.value)})} className="input-field" />
              <input type="number" placeholder="Reorder Qty" value={form.reorder_qty || ''} onChange={(e) => setForm({...form, reorder_qty: parseInt(e.target.value)})} className="input-field" />
              <input placeholder="Batch Number" value={form.batch_number || ''} onChange={(e) => setForm({...form, batch_number: e.target.value})} className="input-field" />
              <div><label className="block text-xs mb-1">Expiry Date</label><input type="date" value={form.expiry_date || ''} onChange={(e) => setForm({...form, expiry_date: e.target.value})} className="input-field w-full" /></div>
              <div className="col-span-2"><textarea placeholder="Notes" value={form.notes || ''} onChange={(e) => setForm({...form, notes: e.target.value})} className="input-field w-full" rows={2} /></div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => { setShowAddModal(false); setForm({}); }} className="btn-secondary">Cancel</button>
              <button onClick={handleAddItem} className="btn-primary">{form.id ? 'Update Item' : 'Add Item'}</button>
            </div>
          </div>
        </div>
      )}

      {showMovementModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowMovementModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Record Stock Movement</h3>
            <div className="space-y-4">
              {!movementForm.item_id && (
                <div>
                  <label className="block text-xs mb-1">Select Item</label>
                  <input type="text" placeholder="Search items..." value={itemSearch} onChange={(e) => setItemSearch(e.target.value)} className="input-field w-full mb-2" />
                  <select value={movementForm.item_id || ''} onChange={(e) => setMovementForm({...movementForm, item_id: parseInt(e.target.value) || e.target.value})} className="input-field w-full" size={5}>
                    {items.filter((i) => !itemSearch || (i.item_name || '').toLowerCase().includes(itemSearch.toLowerCase()) || (i.item_code || '').toLowerCase().includes(itemSearch.toLowerCase())).map((i) => (
                      <option key={i.id} value={i.id}>{i.item_name || i.name} ({i.item_code || i.sku || ''}) - Qty: {i.current_qty || 0}</option>
                    ))}
                  </select>
                </div>
              )}
              <select value={movementForm.movement_type || ''} onChange={(e) => setMovementForm({...movementForm, movement_type: e.target.value})} className="input-field w-full">
                <option value="">Movement Type *</option>
                <option value="in">Stock In</option>
                <option value="out">Stock Out</option>
                <option value="transfer">Transfer</option>
                <option value="adjustment">Adjustment</option>
              </select>
              <input type="number" step="0.01" placeholder="Quantity *" value={movementForm.quantity || ''} onChange={(e) => setMovementForm({...movementForm, quantity: parseFloat(e.target.value)})} className="input-field w-full" />
              {movementForm.movement_type === 'in' && (
                <input type="number" step="0.01" placeholder="Unit Cost" value={movementForm.unit_cost || ''} onChange={(e) => setMovementForm({...movementForm, unit_cost: parseFloat(e.target.value)})} className="input-field w-full" />
              )}
              <select value={movementForm.reference_type || ''} onChange={(e) => setMovementForm({...movementForm, reference_type: e.target.value})} className="input-field w-full">
                <option value="">Reference Type</option>
                <option value="PO">Purchase Order</option>
                <option value="Return">Return</option>
                <option value="Adjustment">Adjustment</option>
                <option value="Transfer">Transfer</option>
              </select>
              {movementForm.movement_type === 'transfer' && (
                <div className="grid grid-cols-2 gap-4">
                  <select value={movementForm.from_warehouse_id || ''} onChange={(e) => setMovementForm({...movementForm, from_warehouse_id: e.target.value})} className="input-field">
                    <option value="">From Warehouse</option>
                    {warehouses.map((w) => <option key={w.id} value={w.id}>{w.warehouse_name || w.name}</option>)}
                  </select>
                  <select value={movementForm.to_warehouse_id || ''} onChange={(e) => setMovementForm({...movementForm, to_warehouse_id: e.target.value})} className="input-field">
                    <option value="">To Warehouse</option>
                    {warehouses.map((w) => <option key={w.id} value={w.id}>{w.warehouse_name || w.name}</option>)}
                  </select>
                </div>
              )}
              <textarea placeholder="Notes" value={movementForm.notes || ''} onChange={(e) => setMovementForm({...movementForm, notes: e.target.value})} className="input-field w-full" rows={2} />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => { setShowMovementModal(false); setMovementForm({}); }} className="btn-secondary">Cancel</button>
              <button onClick={handleRecordMovement} disabled={!movementForm.item_id || !movementForm.movement_type || !movementForm.quantity} className="btn-primary">Record Movement</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
