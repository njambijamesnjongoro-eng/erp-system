import { useState, useEffect } from 'react';
import { Plus, Search, Eye, Send, CheckCircle, XCircle, FileText, Building2, Calendar, DollarSign, ChevronLeft, ChevronRight } from 'lucide-react';
import { purchaseOrderService, procurementService, supplierService } from '../../api/procurement';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { useAuth } from '../../hooks/useAuth';

export function PurchaseOrdersPage() {
  const { hasRole } = useAuth();
  const canManage = hasRole('System Admin', 'CEO', 'Procurement Officer', 'Finance Officer');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [suppliers, setSuppliers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [form, setForm] = useState({});
  const [requests, setRequests] = useState([]);
  const [requestItems, setRequestItems] = useState([]);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveData, setApproveData] = useState({});
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelId, setCancelId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  const statusColors = {
    draft: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    partially_received: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    received: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };

  const fetch = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (supplierFilter) params.supplierId = supplierFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      const { data } = await purchaseOrderService.list(params);
      setOrders(data.data || []);
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchSuppliers = async () => {
    try {
      const { data } = await supplierService.list();
      setSuppliers(data.data || []);
    } catch (err) { console.error(err); }
  };

  const fetchRequests = async () => {
    try {
      const { data } = await procurementService.list({ status: 'approved', limit: 100 });
      setRequests(data.data || []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetch(); }, [statusFilter, supplierFilter, dateFrom, dateTo]);
  useEffect(() => { const timer = setTimeout(() => fetch(), 300); return () => clearTimeout(timer); }, [search]);
  useEffect(() => { fetchSuppliers(); }, []);

  const openCreate = () => {
    setForm({ items: [] });
    setRequestItems([]);
    fetchRequests();
    setShowCreateModal(true);
  };

  const handleRequestSelect = (e) => {
    const reqId = e.target.value;
    if (!reqId) { setForm({ ...form, request_id: '', items: [] }); setRequestItems([]); return; }
    const req = requests.find((r) => r.id === parseInt(reqId) || r.id === reqId);
    setForm({ ...form, request_id: reqId, items: (req?.items || []).map((i) => ({ ...i, unit_cost: i.estimated_cost || 0, total: 0 })) });
    setRequestItems(req?.items || []);
  };

  const updateItemCost = (idx, val) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], unit_cost: parseFloat(val) || 0 };
    items[idx].total = (parseFloat(items[idx].quantity || 0) * parseFloat(items[idx].unit_cost || 0));
    setForm({ ...form, items });
  };

  const calcSubtotal = () => (form.items || []).reduce((s, i) => s + (parseFloat(i.quantity || 0) * parseFloat(i.unit_cost || 0)), 0);
  const calcTax = () => calcSubtotal() * (parseFloat(form.tax_rate || 0) / 100);
  const calcTotal = () => calcSubtotal() + calcTax();

  const handleCreatePO = async () => {
    try {
      const payload = {
        ...form,
        items: form.items.map((i) => ({ item_name: i.item_name || i.name, quantity: i.quantity, unit_cost: i.unit_cost, total: parseFloat(i.quantity) * parseFloat(i.unit_cost) })),
        total_amount: calcTotal(),
      };
      await purchaseOrderService.create(payload);
      setShowCreateModal(false);
      setForm({});
      fetch();
    } catch (err) { alert(err.response?.data?.message || err.message); }
  };

  const viewDetail = async (po) => {
    try {
      const { data } = await purchaseOrderService.getById(po.id);
      setSelectedPO(data);
      setShowDetail(true);
    } catch (err) { console.error(err); }
  };

  const handleApprove = async () => {
    try {
      await purchaseOrderService.approve(selectedPO.id, { notes: approveData.notes || '' });
      setShowApproveModal(false);
      setApproveData({});
      const { data } = await purchaseOrderService.getById(selectedPO.id);
      setSelectedPO(data);
      fetch(pagination.page);
    } catch (err) { alert(err.response?.data?.message || err.message); }
  };

  const handleSend = async (id) => {
    try {
      await purchaseOrderService.send(id);
      fetch(pagination.page);
      if (selectedPO?.id === id) { const { data } = await purchaseOrderService.getById(id); setSelectedPO(data); }
    } catch (err) { alert(err.response?.data?.message || err.message); }
  };

  const handleCancel = async () => {
    try {
      await purchaseOrderService.cancel(cancelId, { reason: cancelReason });
      setShowCancelModal(false);
      setCancelId(null);
      setCancelReason('');
      fetch(pagination.page);
      if (selectedPO?.id === cancelId) { const { data } = await purchaseOrderService.getById(cancelId); setSelectedPO(data); }
    } catch (err) { alert(err.response?.data?.message || err.message); }
  };

  const getStatusBadge = (status) => (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[status] || statusColors.draft}`}>
      {status ? status.replace(/_/g, ' ') : 'draft'}
    </span>
  );

  if (loading && orders.length === 0) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Purchase Orders</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{pagination.total} purchase orders</p>
        </div>
        {canManage && <button onClick={openCreate} className="btn-primary gap-2"><Plus className="w-4 h-4" /> Create PO</button>}
      </div>

      <div className="card">
        <div className="card-body">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search PO number..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field w-auto min-w-[160px]">
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="sent">Sent</option>
              <option value="partially_received">Partially Received</option>
              <option value="received">Received</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)} className="input-field w-auto min-w-[180px]">
              <option value="">All Suppliers</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.supplier_name || s.name}</option>)}
            </select>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input-field w-auto" title="From" />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input-field w-auto" title="To" />
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">No purchase orders found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>PO#</th>
                    <th>Request#</th>
                    <th>Supplier</th>
                    <th>Order Date</th>
                    <th>Expected Delivery</th>
                    <th>Total Amount</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((po) => (
                    <tr key={po.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="font-mono text-sm font-medium">{po.po_number || po.order_number || `PO-${po.id}`}</td>
                      <td className="font-mono text-xs">{po.request_number || po.procurement_request_id || '-'}</td>
                      <td className="text-sm">{po.supplier_name || po.supplier?.supplier_name || '-'}</td>
                      <td className="text-sm">{formatDate(po.order_date || po.created_at)}</td>
                      <td className="text-sm">{formatDate(po.expected_delivery)}</td>
                      <td className="font-medium font-mono text-sm">{formatCurrency(po.total_amount)}</td>
                      <td>{getStatusBadge(po.status)}</td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => viewDetail(po)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg" title="View"><Eye className="w-4 h-4" /></button>
                          {canManage && po.status === 'draft' && (
                            <button onClick={() => { setSelectedPO(po); setApproveData({}); setShowApproveModal(true); }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-emerald-500" title="Approve"><CheckCircle className="w-4 h-4" /></button>
                          )}
                          {canManage && (po.status === 'approved') && (
                            <button onClick={() => handleSend(po.id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-blue-500" title="Send to Supplier"><Send className="w-4 h-4" /></button>
                          )}
                          {canManage && !['received', 'cancelled'].includes(po.status) && (
                            <button onClick={() => { setCancelId(po.id); setCancelReason(''); setShowCancelModal(true); }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-red-500" title="Cancel"><XCircle className="w-4 h-4" /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
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

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Create Purchase Order</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs mb-1">Approved Request</label>
                  <select value={form.request_id || ''} onChange={handleRequestSelect} className="input-field w-full">
                    <option value="">Select Request</option>
                    {requests.map((r) => <option key={r.id} value={r.id}>{r.request_number || `REQ-${r.id}`} - {r.title || r.description || ''}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs mb-1">Supplier</label>
                  <select value={form.supplier_id || ''} onChange={(e) => setForm({...form, supplier_id: e.target.value})} className="input-field w-full">
                    <option value="">Select Supplier</option>
                    {suppliers.filter((s) => s.status === 'active').map((s) => <option key={s.id} value={s.id}>{s.supplier_name || s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs mb-1">Expected Delivery</label><input type="date" value={form.expected_delivery || ''} onChange={(e) => setForm({...form, expected_delivery: e.target.value})} className="input-field w-full" /></div>
                <input placeholder="Payment Terms" value={form.payment_terms || ''} onChange={(e) => setForm({...form, payment_terms: e.target.value})} className="input-field" />
              </div>
              <div><textarea placeholder="Shipping Address" value={form.shipping_address || ''} onChange={(e) => setForm({...form, shipping_address: e.target.value})} className="input-field w-full" rows={2} /></div>

              <div>
                <h4 className="font-semibold mb-2">Items</h4>
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr><th>Item</th><th className="text-center">Qty</th><th className="text-right">Unit Cost</th><th className="text-right">Total</th></tr>
                    </thead>
                    <tbody>
                      {(form.items || []).map((item, idx) => (
                        <tr key={idx}>
                          <td className="text-sm">{item.item_name || item.name || item.description || '-'}</td>
                          <td className="text-center text-sm">{item.quantity || 0}</td>
                          <td className="text-right"><input type="number" step="0.01" value={item.unit_cost} onChange={(e) => updateItemCost(idx, e.target.value)} className="input-field w-28 text-right text-sm" /></td>
                          <td className="text-right font-mono text-sm">{formatCurrency((parseFloat(item.quantity || 0) * parseFloat(item.unit_cost || 0)))}</td>
                        </tr>
                      ))}
                      {(form.items || []).length === 0 && <tr><td colSpan={4} className="text-center text-sm text-gray-400 py-4">Select a request to load items</td></tr>}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-col items-end mt-3 space-y-1 text-sm">
                  <p>Subtotal: <span className="font-mono ml-2">{formatCurrency(calcSubtotal())}</span></p>
                  <div className="flex items-center gap-2">
                    <span>Tax Rate:</span>
                    <input type="number" value={form.tax_rate || 0} onChange={(e) => setForm({...form, tax_rate: parseFloat(e.target.value) || 0})} className="input-field w-20 text-right text-sm" />%
                    <span className="font-mono ml-2">{formatCurrency(calcTax())}</span>
                  </div>
                  <p className="text-base font-bold">Total: <span className="font-mono">{formatCurrency(calcTotal())}</span></p>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowCreateModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleCreatePO} disabled={!form.supplier_id || !form.items?.length} className="btn-primary">Create Purchase Order</button>
            </div>
          </div>
        </div>
      )}

      {showDetail && selectedPO && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowDetail(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold">{selectedPO.po_number || `PO-${selectedPO.id}`}</h3>
                <p className="text-sm text-gray-500">{getStatusBadge(selectedPO.status)}</p>
              </div>
              <div className="flex gap-2">
                {canManage && selectedPO.status === 'draft' && (
                  <button onClick={() => { setShowDetail(false); setSelectedPO(selectedPO); setApproveData({}); setShowApproveModal(true); }} className="btn-primary btn-sm gap-1"><CheckCircle className="w-3 h-3" /> Approve</button>
                )}
                {canManage && selectedPO.status === 'approved' && (
                  <button onClick={async () => { await handleSend(selectedPO.id); }} className="btn-primary btn-sm gap-1"><Send className="w-3 h-3" /> Send</button>
                )}
                {canManage && !['received', 'cancelled'].includes(selectedPO.status) && (
                  <button onClick={() => { setShowDetail(false); setCancelId(selectedPO.id); setCancelReason(''); setShowCancelModal(true); }} className="btn-danger btn-sm gap-1"><XCircle className="w-3 h-3" /> Cancel</button>
                )}
                <button onClick={() => setShowDetail(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><XCircle className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
              <div><span className="text-gray-400">Supplier:</span><p className="font-medium">{selectedPO.supplier_name || selectedPO.supplier?.supplier_name || '-'}</p></div>
              <div><span className="text-gray-400">Order Date:</span><p>{formatDate(selectedPO.order_date || selectedPO.created_at)}</p></div>
              <div><span className="text-gray-400">Expected Delivery:</span><p>{formatDate(selectedPO.expected_delivery)}</p></div>
              <div><span className="text-gray-400">Payment Terms:</span><p>{selectedPO.payment_terms || '-'}</p></div>
            </div>
            {selectedPO.shipping_address && <p className="text-sm mb-4"><span className="text-gray-400">Shipping:</span> {selectedPO.shipping_address}</p>}

            <h4 className="font-semibold mb-2">Items</h4>
            <div className="overflow-x-auto mb-4">
              <table className="data-table">
                <thead>
                  <tr><th>Item</th><th className="text-center">Qty</th><th className="text-right">Unit Cost</th><th className="text-right">Total</th></tr>
                </thead>
                <tbody>
                  {(selectedPO.items || []).map((item, idx) => (
                    <tr key={idx}>
                      <td className="text-sm">{item.item_name || item.name || '-'}</td>
                      <td className="text-center text-sm">{item.quantity}</td>
                      <td className="text-right text-sm font-mono">{formatCurrency(item.unit_cost)}</td>
                      <td className="text-right text-sm font-mono">{formatCurrency(item.total || (item.quantity * item.unit_cost))}</td>
                    </tr>
                  ))}
                  {(!selectedPO.items || selectedPO.items.length === 0) && <tr><td colSpan={4} className="text-center text-sm text-gray-400 py-4">No items</td></tr>}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col items-end space-y-1 text-sm border-t pt-3">
              <p>Subtotal: <span className="font-mono ml-2">{formatCurrency(selectedPO.subtotal || selectedPO.items?.reduce((s, i) => s + (parseFloat(i.total) || parseFloat(i.quantity) * parseFloat(i.unit_cost)), 0) || 0)}</span></p>
              {selectedPO.tax_amount > 0 && <p>Tax: <span className="font-mono ml-2">{formatCurrency(selectedPO.tax_amount)}</span></p>}
              <p className="text-base font-bold">Total: <span className="font-mono">{formatCurrency(selectedPO.total_amount)}</span></p>
            </div>

            {selectedPO.approval_history?.length > 0 && (
              <div className="border-t mt-4 pt-4">
                <h4 className="font-semibold mb-2">Approval History</h4>
                <div className="space-y-2">
                  {selectedPO.approval_history.map((a, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <span className="text-gray-400">{a.action || a.status}:</span>
                      <span className="font-medium">{a.approver_name || a.approved_by || '-'}</span>
                      <span className="text-gray-400">{a.date ? formatDate(a.date) : ''}</span>
                      {a.notes && <span className="text-gray-500">- {a.notes}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showApproveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowApproveModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-2">Approve Purchase Order</h3>
            <p className="text-sm text-gray-500 mb-4">Are you sure you want to approve this purchase order?</p>
            <textarea placeholder="Approval notes (optional)" value={approveData.notes || ''} onChange={(e) => setApproveData({...approveData, notes: e.target.value})} className="input-field w-full" rows={3} />
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowApproveModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleApprove} className="btn-primary">Approve PO</button>
            </div>
          </div>
        </div>
      )}

      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCancelModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-2 text-red-600">Cancel Purchase Order</h3>
            <p className="text-sm text-gray-500 mb-4">Provide a reason for cancelling this purchase order.</p>
            <textarea placeholder="Cancellation reason *" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} className="input-field w-full" rows={3} />
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowCancelModal(false)} className="btn-secondary">Keep</button>
              <button onClick={handleCancel} disabled={!cancelReason.trim()} className="btn-danger">Cancel PO</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
