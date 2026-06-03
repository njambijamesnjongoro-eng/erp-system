import { useState, useEffect } from 'react';
import { Plus, Search, ClipboardCheck, Truck, Package, X, Eye, ChevronLeft, ChevronRight, AlertTriangle, FileText } from 'lucide-react';
import { goodsReceiptService, purchaseOrderService, supplierService } from '../../api/procurement';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { useAuth } from '../../hooks/useAuth';

const fmt = (n) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(n || 0);

const statusStyles = {
  draft: 'badge-gray',
  received: 'badge-amber',
  verified: 'badge-blue',
  partially_approved: 'badge-orange',
  approved: 'badge-emerald',
};

export function GRNPage() {
  const { user } = useAuth();
  const [grns, setGrns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [suppliers, setSuppliers] = useState([]);
  const [pos, setPos] = useState([]);
  const [selectedPO, setSelectedPO] = useState(null);
  const [receiveItems, setReceiveItems] = useState([]);
  const [receiveTab, setReceiveTab] = useState('items');
  const [form, setForm] = useState({});
  const limit = 15;

  const fetch = async () => {
    setLoading(true);
    try {
      const params = { page, limit, search };
      if (statusFilter) params.status = statusFilter;
      if (supplierFilter) params.supplier_id = supplierFilter;
      const { data } = await goodsReceiptService.list(params);
      setGrns(data.data || []);
      setTotal(data.total || 0);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [page, search, statusFilter, supplierFilter]);

  useEffect(() => {
    supplierService.list({ limit: 500 }).then(({ data }) => setSuppliers(data.data || [])).catch(() => {});
  }, []);

  const openCreate = async () => {
    setShowCreateModal(true);
    setSelectedPO(null);
    setForm({});
    try {
      const { data } = await purchaseOrderService.list({ status: 'sent', limit: 200 });
      setPos(data.data || []);
    } catch (err) { console.error(err); }
  };

  const handlePOSelect = async (poId) => {
    setForm({ ...form, purchase_order_id: poId });
    try {
      const { data } = await purchaseOrderService.getById(poId);
      setSelectedPO(data);
      setForm(f => ({ ...f, supplier_id: data.supplier_id, supplier_name: data.supplier_name }));
    } catch (err) { console.error(err); }
  };

  const handleCreateGRN = async () => {
    try {
      await goodsReceiptService.create(form);
      setShowCreateModal(false);
      setForm({});
      setSelectedPO(null);
      fetch();
    } catch (err) { alert(err.response?.data?.message || err.message); }
  };

  const openReceive = (grn) => {
    setSelected(grn);
    setReceiveItems((grn.items || []).map(item => ({
      id: item.id,
      item_id: item.item_id,
      item_name: item.item_name,
      quantity_ordered: item.quantity_ordered || 0,
      quantity_received: item.quantity_received || 0,
      quantity_accepted: item.quantity_accepted || 0,
      quantity_rejected: item.quantity_rejected || 0,
      rejection_reason: item.rejection_reason || '',
    })));
    setShowReceiveModal(true);
  };

  const updateReceiveItem = (idx, field, value) => {
    setReceiveItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  };

  const handleReceive = async () => {
    try {
      await goodsReceiptService.receive(selected.id, { items: receiveItems });
      setShowReceiveModal(false);
      setSelected(null);
      fetch();
    } catch (err) { alert(err.response?.data?.message || err.message); }
  };

  const openDetail = async (grn) => {
    try {
      const { data } = await goodsReceiptService.getById(grn.id);
      setSelected(data);
    } catch (err) { console.error(err); }
  };

  const totalPages = Math.ceil(total / limit);

  if (loading && !grns.length) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Goods Received Notes</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Receive and verify goods from suppliers</p>
        </div>
        <button onClick={openCreate} className="btn-primary gap-2"><Plus className="w-4 h-4" /> Create GRN</button>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search GRN number..." className="input-field w-full pl-10" />
            </div>
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="input-field w-40">
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="received">Received</option>
              <option value="verified">Verified</option>
              <option value="partially_approved">Partially Approved</option>
              <option value="approved">Approved</option>
            </select>
            <select value={supplierFilter} onChange={e => { setSupplierFilter(e.target.value); setPage(1); }} className="input-field w-48">
              <option value="">All Suppliers</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>GRN #</th><th>PO #</th><th>Supplier</th><th>Received Date</th><th>Status</th><th>Items</th><th>Actions</th></tr></thead>
              <tbody>
                {grns.map(g => (
                  <tr key={g.id}>
                    <td className="font-mono text-sm">{g.grn_number}</td>
                    <td className="font-mono text-sm">{g.po_number || '-'}</td>
                    <td>{g.supplier_name || '-'}</td>
                    <td>{formatDate(g.received_date || g.created_at)}</td>
                    <td><span className={`badge ${statusStyles[g.status] || 'badge-gray'}`}>{g.status?.replace(/_/g, ' ')}</span></td>
                    <td>{g.items_count ?? (g.items?.length ?? 0)}</td>
                    <td>
                      <div className="flex gap-2">
                        <button onClick={() => openDetail(g)} className="btn-secondary btn-sm gap-1"><Eye className="w-3 h-3" /> View</button>
                        {(g.status === 'draft' || g.status === 'received') && (
                          <button onClick={() => openReceive(g)} className="btn-primary btn-sm gap-1"><ClipboardCheck className="w-3 h-3" /> Receive</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {grns.length === 0 && <tr><td colSpan={7} className="text-center text-gray-400 py-8">No goods received notes found</td></tr>}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="btn-secondary btn-sm"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary btn-sm"><ChevronRight className="w-4 h-4" /></button>
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-bold">Create Goods Received Note</h3><button onClick={() => setShowCreateModal(false)}><X className="w-5 h-5" /></button></div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Select Purchase Order</label>
                <select value={form.purchase_order_id||''} onChange={e => handlePOSelect(e.target.value)} className="input-field w-full" required>
                  <option value="">Choose a PO...</option>
                  {pos.map(po => <option key={po.id} value={po.id}>{po.po_number} - {po.supplier_name} ({formatCurrency(po.total_amount)})</option>)}
                </select>
              </div>

              {selectedPO && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between"><span className="text-sm text-gray-500">Supplier:</span><span className="font-medium">{selectedPO.supplier_name}</span></div>
                  <div className="flex justify-between"><span className="text-sm text-gray-500">PO Total:</span><span className="font-medium">{formatCurrency(selectedPO.total_amount)}</span></div>
                  <div className="flex justify-between"><span className="text-sm text-gray-500">PO Date:</span><span className="font-medium">{formatDate(selectedPO.order_date)}</span></div>
                </div>
              )}

              {selectedPO?.items && selectedPO.items.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Items from PO</h4>
                  <div className="overflow-x-auto">
                    <table className="data-table text-sm">
                      <thead><tr><th>Item</th><th>Qty Ordered</th><th>Qty Received</th><th>Qty Accepted</th><th>Qty Rejected</th><th>Rejection Reason</th></tr></thead>
                      <tbody>
                        {selectedPO.items.map((item, idx) => (
                          <tr key={item.id || idx}>
                            <td>{item.item_name || item.name}</td>
                            <td>{item.quantity_ordered || item.quantity || 0}</td>
                            <td><input type="number" className="input-field w-20" value={form[`qty_received_${item.id}`]||''} onChange={e => setForm({...form, [`qty_received_${item.id}`]: parseInt(e.target.value)||0})} /></td>
                            <td><input type="number" className="input-field w-20" value={form[`qty_accepted_${item.id}`]||''} onChange={e => setForm({...form, [`qty_accepted_${item.id}`]: parseInt(e.target.value)||0})} /></td>
                            <td><input type="number" className="input-field w-20" value={form[`qty_rejected_${item.id}`]||''} onChange={e => setForm({...form, [`qty_rejected_${item.id}`]: parseInt(e.target.value)||0})} /></td>
                            <td><input className="input-field w-32" value={form[`rejection_reason_${item.id}`]||''} onChange={e => setForm({...form, [`rejection_reason_${item.id}`]: e.target.value})} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowCreateModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleCreateGRN} disabled={!form.purchase_order_id} className="btn-primary">Create GRN</button>
            </div>
          </div>
        </div>
      )}

      {showReceiveModal && selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowReceiveModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-3xl mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Receive Goods - {selected.grn_number}</h3>
              <button onClick={() => setShowReceiveModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4 flex flex-wrap gap-4 text-sm">
              <div><span className="text-gray-500">PO:</span> <span className="font-medium">{selected.po_number}</span></div>
              <div><span className="text-gray-500">Supplier:</span> <span className="font-medium">{selected.supplier_name}</span></div>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table text-sm">
                <thead><tr><th>Item</th><th>Ordered</th><th>Received</th><th>Accepted</th><th>Rejected</th><th>To Receive</th><th>To Accept</th><th>To Reject</th><th>Reason</th></tr></thead>
                <tbody>
                  {receiveItems.map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td className="font-medium">{item.item_name}</td>
                      <td>{item.quantity_ordered}</td>
                      <td>{item.quantity_received}</td>
                      <td>{item.quantity_accepted}</td>
                      <td>{item.quantity_rejected}</td>
                      <td><input type="number" className="input-field w-16" value={item.quantity_received} onChange={e => updateReceiveItem(idx, 'quantity_received', parseInt(e.target.value)||0)} /></td>
                      <td><input type="number" className="input-field w-16" value={item.quantity_accepted} onChange={e => updateReceiveItem(idx, 'quantity_accepted', parseInt(e.target.value)||0)} /></td>
                      <td><input type="number" className="input-field w-16" value={item.quantity_rejected} onChange={e => updateReceiveItem(idx, 'quantity_rejected', parseInt(e.target.value)||0)} /></td>
                      <td><input className="input-field w-28" value={item.rejection_reason} onChange={e => updateReceiveItem(idx, 'rejection_reason', e.target.value)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowReceiveModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleReceive} className="btn-primary gap-1"><ClipboardCheck className="w-4 h-4" /> Confirm Receipt</button>
            </div>
          </div>
        </div>
      )}

      {selected && !showReceiveModal && !showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40" onClick={() => setSelected(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-4xl mx-4 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-primary-600" />
                <div>
                  <h2 className="text-xl font-bold">{selected.grn_number}</h2>
                  <p className="text-sm text-gray-500">PO: {selected.po_number} &middot; {selected.supplier_name}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="btn-secondary btn-sm"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div><span className="text-gray-500">Status:</span> <span className={`badge ml-2 ${statusStyles[selected.status] || 'badge-gray'}`}>{selected.status?.replace(/_/g, ' ')}</span></div>
                <div><span className="text-gray-500">Received Date:</span> <span className="font-medium ml-2">{formatDate(selected.received_date || selected.created_at)}</span></div>
                <div><span className="text-gray-500">Created By:</span> <span className="font-medium ml-2">{selected.created_by_name || '-'}</span></div>
              </div>
            </div>

            <div className="flex border-b border-gray-200 dark:border-gray-700">
              <button onClick={() => setReceiveTab('items')} className={`px-6 py-3 text-sm font-medium border-b-2 ${receiveTab === 'items' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Items</button>
              <button onClick={() => setReceiveTab('discrepancies')} className={`px-6 py-3 text-sm font-medium border-b-2 ${receiveTab === 'discrepancies' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                Discrepancies {selected.discrepancies?.length > 0 && <span className="ml-1 inline-flex items-center justify-center w-5 h-5 text-xs rounded-full bg-red-100 text-red-600">{selected.discrepancies.length}</span>}
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {receiveTab === 'items' && (
                <div className="overflow-x-auto">
                  <table className="data-table text-sm">
                    <thead><tr><th>Item</th><th>Qty Ordered</th><th>Qty Received</th><th>Qty Accepted</th><th>Qty Rejected</th><th>Rejection Reason</th></tr></thead>
                    <tbody>
                      {(selected.items || []).map((item, idx) => (
                        <tr key={item.id || idx}>
                          <td className="font-medium">{item.item_name || item.name}</td>
                          <td>{item.quantity_ordered || item.quantity || 0}</td>
                          <td>{item.quantity_received ?? 0}</td>
                          <td>{item.quantity_accepted ?? 0}</td>
                          <td>{item.quantity_rejected ?? 0}</td>
                          <td className="max-w-[150px] truncate">{item.rejection_reason || '-'}</td>
                        </tr>
                      ))}
                      {(!selected.items || selected.items.length === 0) && <tr><td colSpan={6} className="text-center text-gray-400 py-6">No items</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}

              {receiveTab === 'discrepancies' && (
                <div>
                  {selected.discrepancies?.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="data-table text-sm">
                        <thead><tr><th>Item</th><th>Type</th><th>Expected</th><th>Actual</th><th>Notes</th></tr></thead>
                        <tbody>
                          {selected.discrepancies.map((d, idx) => (
                            <tr key={d.id || idx}>
                              <td>{d.item_name}</td>
                              <td><span className="badge badge-red">{d.discrepancy_type}</span></td>
                              <td>{d.expected_quantity}</td>
                              <td>{d.actual_quantity}</td>
                              <td>{d.notes || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 py-12 text-gray-400">
                      <AlertTriangle className="w-5 h-5" />
                      <span>No discrepancies reported</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
