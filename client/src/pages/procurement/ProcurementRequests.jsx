import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Send, Trash2, X, AlertTriangle, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { procurementService } from '../../api/procurement';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { useAuth } from '../../hooks/useAuth';

const fmt = (n) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0);

const STATUS_COLORS = {
  draft: 'gray',
  pending: 'amber',
  approved: 'emerald',
  rejected: 'red',
  ordered: 'blue',
  delivered: 'teal',
  cancelled: 'slate',
};

const URGENCY_COLORS = {
  low: 'emerald',
  medium: 'amber',
  high: 'orange',
  critical: 'red',
};

export function ProcurementRequests() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ status: '', category_id: '', search: '', page: 1, limit: 10 });
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({ title: '', description: '', category_id: '', urgency: 'medium', department: '', budget_code: '' });
  const [items, setItems] = useState([]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await procurementService.getAll(filters);
      setRequests(res.data?.data || res.data || []);
      setTotal(res.data?.total ?? 0);
      setTotalPages(res.data?.totalPages ?? 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, [filters]);

  useEffect(() => {
    if (showModal) {
      procurementService.getCategories().then((res) => setCategories(res.data?.data || res.data || [])).catch(() => {});
      if (user) setFormData((prev) => ({ ...prev, department: user.department || '' }));
    }
  }, [showModal, user]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: key === 'page' ? value : 1 }));
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this request?')) return;
    try {
      await procurementService.delete(id);
      fetchRequests();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSubmit = async (id) => {
    if (!confirm('Submit this request for approval?')) return;
    try {
      await procurementService.submit(id);
      fetchRequests();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreate = async (action) => {
    try {
      const payload = { ...formData, items };
      if (action === 'draft') payload.status = 'draft';
      await procurementService.create(payload);
      setShowModal(false);
      setFormData({ title: '', description: '', category_id: '', urgency: 'medium', department: '', budget_code: '' });
      setItems([]);
      fetchRequests();
    } catch (err) {
      alert(err.message);
    }
  };

  const addItem = () => {
    setItems((prev) => [...prev, { item_name: '', description: '', quantity: 1, unit_of_measure: 'each', estimated_unit_cost: 0 }]);
  };

  const updateItem = (index, key, value) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [key]: value };
      return updated;
    });
  };

  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const totalEstimated = items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.estimated_unit_cost) || 0), 0);

  const statusBadge = (status) => <span className={`badge badge-${STATUS_COLORS[status] || 'gray'}`}>{status}</span>;
  const urgencyBadge = (urgency) => <span className={`badge badge-${URGENCY_COLORS[urgency] || 'gray'}`}>{urgency}</span>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Procurement Requests</h1>
          <p className="text-sm text-gray-500 mt-1">Manage purchase requisitions</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary inline-flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Request
        </button>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="input pl-9"
                placeholder="Search requests..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </div>
            <select className="input w-auto" value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)}>
              <option value="">All Statuses</option>
              {Object.keys(STATUS_COLORS).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className="input w-auto" value={filters.category_id} onChange={(e) => handleFilterChange('category_id', e.target.value)}>
              <option value="">All Categories</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button className="btn btn-secondary inline-flex items-center gap-2">
              <Filter className="w-4 h-4" /> Filters
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body p-0">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Request#</th>
                  <th>Title</th>
                  <th>Requester</th>
                  <th>Department</th>
                  <th>Category</th>
                  <th>Urgency</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} className="text-center py-8 text-gray-400">Loading...</td></tr>
                ) : requests.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-8 text-gray-400">No requests found</td></tr>
                ) : requests.map((req) => (
                  <tr key={req.id}>
                    <td className="font-mono text-sm">#{req.request_number ?? req.id}</td>
                    <td className="max-w-[160px] truncate font-medium">{req.title}</td>
                    <td>{req.requester_name ?? req.requester?.name}</td>
                    <td className="text-sm">{req.department}</td>
                    <td className="text-sm">{req.category_name ?? req.category?.name}</td>
                    <td>{urgencyBadge(req.urgency)}</td>
                    <td>{fmt(req.total ?? req.estimated_total)}</td>
                    <td>{statusBadge(req.status)}</td>
                    <td className="text-sm text-gray-500">{formatDate(req.created_at)}</td>
                    <td>
                      <div className="flex gap-1">
                        <Link to={`/procurement/requests/${req.id}`} className="btn btn-sm btn-ghost" title="View">
                          <Eye className="w-4 h-4" />
                        </Link>
                        {req.status === 'draft' && (
                          <>
                            <button onClick={() => handleSubmit(req.id)} className="btn btn-sm btn-ghost text-blue-600" title="Submit">
                              <Send className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(req.id)} className="btn btn-sm btn-ghost text-red-500" title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {totalPages > 1 && (
          <div className="card-footer flex items-center justify-between">
            <p className="text-sm text-gray-500">Showing page {filters.page} of {totalPages} ({total} total)</p>
            <div className="flex gap-1">
              <button disabled={filters.page <= 1} onClick={() => handleFilterChange('page', filters.page - 1)} className="btn btn-sm btn-ghost">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button disabled={filters.page >= totalPages} onClick={() => handleFilterChange('page', filters.page + 1)} className="btn btn-sm btn-ghost">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 pb-10 bg-black/50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold">New Procurement Request</h2>
              <button onClick={() => setShowModal(false)} className="btn btn-sm btn-ghost"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="label">Title</label>
                  <input className="input" value={formData.title} onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))} />
                </div>
                <div className="md:col-span-2">
                  <label className="label">Description</label>
                  <textarea className="input" rows={3} value={formData.description} onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Category</label>
                  <select className="input" value={formData.category_id} onChange={(e) => setFormData((prev) => ({ ...prev, category_id: e.target.value }))}>
                    <option value="">Select category</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Urgency</label>
                  <select className="input" value={formData.urgency} onChange={(e) => setFormData((prev) => ({ ...prev, urgency: e.target.value }))}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="label">Department</label>
                  <input className="input" value={formData.department} onChange={(e) => setFormData((prev) => ({ ...prev, department: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Budget Code</label>
                  <input className="input" value={formData.budget_code} onChange={(e) => setFormData((prev) => ({ ...prev, budget_code: e.target.value }))} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-sm">Line Items</h4>
                  <button onClick={addItem} className="btn btn-sm btn-secondary inline-flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add Item
                  </button>
                </div>
                {items.length === 0 && <p className="text-sm text-gray-400">No items added yet.</p>}
                {items.map((item, idx) => (
                  <div key={idx} className="border rounded-lg p-3 mb-2 relative">
                    <button onClick={() => removeItem(idx)} className="absolute top-2 right-2 btn btn-sm btn-ghost text-red-400"><X className="w-4 h-4" /></button>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                      <div className="lg:col-span-2">
                        <label className="label text-xs">Item Name</label>
                        <input className="input" value={item.item_name} onChange={(e) => updateItem(idx, 'item_name', e.target.value)} />
                      </div>
                      <div className="lg:col-span-2">
                        <label className="label text-xs">Description</label>
                        <input className="input" value={item.description} onChange={(e) => updateItem(idx, 'description', e.target.value)} />
                      </div>
                      <div>
                        <label className="label text-xs">Quantity</label>
                        <input className="input" type="number" min={1} value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} />
                      </div>
                      <div>
                        <label className="label text-xs">UoM</label>
                        <select className="input" value={item.unit_of_measure} onChange={(e) => updateItem(idx, 'unit_of_measure', e.target.value)}>
                          <option value="each">Each</option>
                          <option value="kg">Kg</option>
                          <option value="litre">Litre</option>
                          <option value="meter">Meter</option>
                          <option value="box">Box</option>
                          <option value="pack">Pack</option>
                        </select>
                      </div>
                      <div>
                        <label className="label text-xs">Unit Cost (KES)</label>
                        <input className="input" type="number" min={0} value={item.estimated_unit_cost} onChange={(e) => updateItem(idx, 'estimated_unit_cost', e.target.value)} />
                      </div>
                      <div className="flex items-end">
                        <p className="text-sm font-semibold text-gray-700">
                          Sub: {fmt((Number(item.quantity) || 0) * (Number(item.estimated_unit_cost) || 0))}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {items.length > 0 && (
                  <div className="text-right mt-3 font-bold text-lg">
                    Estimated Total: {fmt(totalEstimated)}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
              <button onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={() => handleCreate('draft')} className="btn btn-secondary">Save as Draft</button>
              <button onClick={() => handleCreate('submit')} className="btn btn-primary">Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
