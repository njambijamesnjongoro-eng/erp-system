import { useState, useEffect } from 'react';
import { Plus, Search, Star, Building2, Phone, Mail, MapPin, FileText, X, Edit3, Ban, CheckCircle, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { supplierService } from '../../api/procurement';
import { formatDate } from '../../utils/helpers';
import { useAuth } from '../../hooks/useAuth';

const fmt = (n) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 }).format(n || 0);

export function SuppliersPage() {
  const { hasRole } = useAuth();
  const canManage = hasRole('System Admin', 'CEO', 'Procurement Officer');
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [performance, setPerformance] = useState(null);
  const [showContractModal, setShowContractModal] = useState(false);
  const [contractForm, setContractForm] = useState({});
  const [showRateModal, setShowRateModal] = useState(false);
  const [rateForm, setRateForm] = useState({ quality: 0, communication: 0, delivery_on_time: true, notes: '' });
  const [showBlacklistModal, setShowBlacklistModal] = useState(false);
  const [blacklistReason, setBlacklistReason] = useState('');
  const [blacklistId, setBlacklistId] = useState(null);

  const fetch = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;
      const { data } = await supplierService.list(params);
      setSuppliers(data.data || []);
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
      const cats = [...new Set((data.data || []).map(s => s.category).filter(Boolean))];
      setCategories(cats);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [statusFilter, categoryFilter]);

  useEffect(() => {
    const timer = setTimeout(() => fetch(), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const openAdd = () => {
    setEditing(null);
    setForm({});
    setShowModal(true);
  };

  const openEdit = (sup) => {
    setEditing(sup);
    setForm(sup);
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      if (editing) await supplierService.update(editing.id, form);
      else await supplierService.create(form);
      setShowModal(false);
      setForm({});
      setEditing(null);
      fetch(pagination.page);
    } catch (err) { alert(err.response?.data?.message || err.message); }
  };

  const fetchDetail = async (id) => {
    setSelectedId(id);
    try {
      const [d, cons, perf] = await Promise.all([
        supplierService.getById(id),
        supplierService.getContracts(id),
        supplierService.getPerformance(id),
      ]);
      setDetailData(d.data);
      setContracts(cons.data || []);
      setPerformance(perf.data);
    } catch (err) { console.error(err); }
  };

  const handleCreateContract = async () => {
    try {
      await supplierService.createContract(selectedId, contractForm);
      setShowContractModal(false);
      setContractForm({});
      const { data } = await supplierService.getContracts(selectedId);
      setContracts(data || []);
    } catch (err) { alert(err.response?.data?.message || err.message); }
  };

  const handleRateSupplier = async () => {
    try {
      await supplierService.rateSupplier(selectedId, rateForm);
      setShowRateModal(false);
      setRateForm({ quality: 0, communication: 0, delivery_on_time: true, notes: '' });
      const { data } = await supplierService.getPerformance(selectedId);
      setPerformance(data);
    } catch (err) { alert(err.response?.data?.message || err.message); }
  };

  const handleBlacklist = async () => {
    try {
      await supplierService.blacklist(blacklistId, { reason: blacklistReason });
      setShowBlacklistModal(false);
      setBlacklistReason('');
      setBlacklistId(null);
      fetch(pagination.page);
      if (selectedId === blacklistId) fetchDetail(blacklistId);
    } catch (err) { alert(err.response?.data?.message || err.message); }
  };

  const handleWhitelist = async (id) => {
    try {
      await supplierService.whitelist(id);
      fetch(pagination.page);
      if (selectedId === id) fetchDetail(id);
    } catch (err) { alert(err.response?.data?.message || err.message); }
  };

  const renderStars = (rating, interactive = false, onChange) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        interactive ? (
          <button key={s} type="button" onClick={() => onChange(s)} className={`${s <= rating ? 'text-amber-400' : 'text-gray-300'}`}>
            <Star className="w-4 h-4 fill-current" />
          </button>
        ) : (
          <Star key={s} className={`w-3.5 h-3.5 ${s <= (rating || 0) ? 'text-amber-400 fill-current' : 'text-gray-300'}`} />
        )
      ))}
    </div>
  );

  const getStatusBadge = (status) => {
    const colors = { active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', blacklisted: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', inactive: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' };
    return <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status] || colors.inactive}`}>{status}</span>;
  };

  if (loading && suppliers.length === 0) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Supplier Management</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{pagination.total} suppliers</p>
        </div>
        {canManage && <button onClick={openAdd} className="btn-primary gap-2"><Plus className="w-4 h-4" /> Add Supplier</button>}
      </div>

      <div className="card">
        <div className="card-body">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search by name, code, contact..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field w-auto min-w-[140px]">
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="blacklisted">Blacklisted</option>
              <option value="inactive">Inactive</option>
            </select>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="input-field w-auto min-w-[160px]">
              <option value="">All Categories</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {suppliers.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">No suppliers found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Supplier Name</th>
                    <th>Contact Person</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Category</th>
                    <th>Rating</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((s) => (
                    <tr key={s.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 ${selectedId === s.id ? 'bg-primary-50 dark:bg-primary-900/10' : ''}`}>
                      <td className="font-mono text-sm">{s.code || s.supplier_code || '-'}</td>
                      <td className="font-medium">{s.supplier_name || s.name}</td>
                      <td className="text-sm">{s.contact_person || '-'}</td>
                      <td className="text-sm">{s.email || '-'}</td>
                      <td className="text-sm">{s.phone || '-'}</td>
                      <td><span className="badge badge-indigo">{s.category || '-'}</span></td>
                      <td>{renderStars(s.avg_rating || s.rating)}</td>
                      <td>{getStatusBadge(s.status || 'active')}</td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => fetchDetail(s.id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg" title="View Details"><Eye className="w-4 h-4" /></button>
                          {canManage && (
                            <>
                              <button onClick={() => openEdit(s)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg" title="Edit"><Edit3 className="w-4 h-4" /></button>
                              {s.status !== 'blacklisted' ? (
                                <button onClick={() => { setBlacklistId(s.id); setShowBlacklistModal(true); }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-red-500" title="Blacklist"><Ban className="w-4 h-4" /></button>
                              ) : (
                                <button onClick={() => handleWhitelist(s.id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-emerald-500" title="Reactivate"><CheckCircle className="w-4 h-4" /></button>
                              )}
                            </>
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

      {selectedId && detailData && (
        <div className="card">
          <div className="card-body">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-bold">{detailData.supplier_name || detailData.name}</h2>
              <div className="flex gap-2">
                {canManage && <button onClick={() => setShowRateModal(true)} className="btn-secondary btn-sm gap-1"><Star className="w-3 h-3" /> Rate</button>}
                <button onClick={() => { setSelectedId(null); setDetailData(null); }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><X className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="space-y-2 text-sm">
                <p><Mail className="w-3.5 h-3.5 inline mr-1.5 text-gray-400" />{detailData.email || '-'}</p>
                <p><Phone className="w-3.5 h-3.5 inline mr-1.5 text-gray-400" />{detailData.phone || '-'} {detailData.alternative_phone && `/ ${detailData.alternative_phone}`}</p>
                <p><MapPin className="w-3.5 h-3.5 inline mr-1.5 text-gray-400" />{detailData.address || '-'}{detailData.city ? `, ${detailData.city}` : ''}</p>
              </div>
              <div className="space-y-2 text-sm">
                <p>Tax ID: <span className="font-mono">{detailData.tax_id || '-'}</span></p>
                <p>Payment Terms: {detailData.payment_terms || '-'}</p>
                <p>Category: <span className="badge badge-indigo">{detailData.category || '-'}</span></p>
              </div>
              <div className="space-y-2 text-sm">
                <p>Bank: {detailData.bank_name || '-'} {detailData.bank_account ? `(${detailData.bank_account})` : ''}</p>
                <p>Status: {getStatusBadge(detailData.status)}</p>
                {performance && (
                  <div>
                    <p className="mb-1">Avg Score: <span className="font-semibold">{performance.avg_score || performance.average_rating || 'N/A'}</span></p>
                    {renderStars(performance.avg_score || performance.average_rating)}
                  </div>
                )}
              </div>
            </div>
            {detailData.notes && <p className="text-sm text-gray-500 mb-4">Notes: {detailData.notes}</p>}

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Contracts ({contracts.length})</h3>
                {canManage && <button onClick={() => setShowContractModal(true)} className="btn-primary btn-sm gap-1"><Plus className="w-3 h-3" /> Add Contract</button>}
              </div>
              {contracts.length === 0 ? (
                <p className="text-sm text-gray-400">No contracts yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr><th>Title</th><th>Start Date</th><th>End Date</th><th>Value</th><th>Terms</th></tr>
                    </thead>
                    <tbody>
                      {contracts.map((c) => (
                        <tr key={c.id}>
                          <td className="font-medium">{c.contract_title || c.title}</td>
                          <td className="text-sm">{formatDate(c.start_date)}</td>
                          <td className="text-sm">{formatDate(c.end_date)}</td>
                          <td className="font-mono text-sm">{fmt(c.value || c.contract_value)}</td>
                          <td className="text-sm max-w-[200px] truncate">{c.terms || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">{editing ? 'Edit Supplier' : 'Add Supplier'}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><input placeholder="Supplier Name *" value={form.supplier_name || form.name || ''} onChange={(e) => setForm({...form, supplier_name: e.target.value})} className="input-field w-full" /></div>
              <input placeholder="Contact Person" value={form.contact_person || ''} onChange={(e) => setForm({...form, contact_person: e.target.value})} className="input-field" />
              <input placeholder="Email" value={form.email || ''} onChange={(e) => setForm({...form, email: e.target.value})} className="input-field" />
              <input placeholder="Phone" value={form.phone || ''} onChange={(e) => setForm({...form, phone: e.target.value})} className="input-field" />
              <input placeholder="Alternative Phone" value={form.alternative_phone || ''} onChange={(e) => setForm({...form, alternative_phone: e.target.value})} className="input-field" />
              <div className="col-span-2"><textarea placeholder="Address" value={form.address || ''} onChange={(e) => setForm({...form, address: e.target.value})} className="input-field w-full" rows={2} /></div>
              <input placeholder="City" value={form.city || ''} onChange={(e) => setForm({...form, city: e.target.value})} className="input-field" />
              <input placeholder="Tax ID" value={form.tax_id || ''} onChange={(e) => setForm({...form, tax_id: e.target.value})} className="input-field" />
              <input placeholder="Payment Terms (e.g. Net 30)" value={form.payment_terms || ''} onChange={(e) => setForm({...form, payment_terms: e.target.value})} className="input-field" />
              <input placeholder="Bank Name" value={form.bank_name || ''} onChange={(e) => setForm({...form, bank_name: e.target.value})} className="input-field" />
              <input placeholder="Bank Account" value={form.bank_account || ''} onChange={(e) => setForm({...form, bank_account: e.target.value})} className="input-field" />
              <input placeholder="Category" value={form.category || ''} onChange={(e) => setForm({...form, category: e.target.value})} className="input-field" />
              <div className="col-span-2"><textarea placeholder="Notes" value={form.notes || ''} onChange={(e) => setForm({...form, notes: e.target.value})} className="input-field w-full" rows={2} /></div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} className="btn-primary">{editing ? 'Update Supplier' : 'Save Supplier'}</button>
            </div>
          </div>
        </div>
      )}

      {showContractModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowContractModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Add Contract</h3>
            <div className="space-y-4">
              <input placeholder="Contract Title *" value={contractForm.contract_title || ''} onChange={(e) => setContractForm({...contractForm, contract_title: e.target.value})} className="input-field w-full" />
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs mb-1">Start Date</label><input type="date" value={contractForm.start_date || ''} onChange={(e) => setContractForm({...contractForm, start_date: e.target.value})} className="input-field w-full" /></div>
                <div><label className="block text-xs mb-1">End Date</label><input type="date" value={contractForm.end_date || ''} onChange={(e) => setContractForm({...contractForm, end_date: e.target.value})} className="input-field w-full" /></div>
              </div>
              <input type="number" step="0.01" placeholder="Contract Value" value={contractForm.value || ''} onChange={(e) => setContractForm({...contractForm, value: parseFloat(e.target.value)})} className="input-field w-full" />
              <textarea placeholder="Terms & Conditions" value={contractForm.terms || ''} onChange={(e) => setContractForm({...contractForm, terms: e.target.value})} className="input-field w-full" rows={3} />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowContractModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleCreateContract} className="btn-primary">Create Contract</button>
            </div>
          </div>
        </div>
      )}

      {showRateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowRateModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Rate Supplier</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Quality Rating</label>
                <div className="flex gap-1">{renderStars(rateForm.quality, true, (v) => setRateForm({...rateForm, quality: v}))}</div>
              </div>
              <div>
                <label className="block text-sm mb-1">Communication Rating</label>
                <div className="flex gap-1">{renderStars(rateForm.communication, true, (v) => setRateForm({...rateForm, communication: v}))}</div>
              </div>
              <div>
                <label className="block text-sm mb-1">Delivery On Time</label>
                <select value={rateForm.delivery_on_time} onChange={(e) => setRateForm({...rateForm, delivery_on_time: e.target.value === 'true'})} className="input-field w-full">
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
              <textarea placeholder="Notes" value={rateForm.notes} onChange={(e) => setRateForm({...rateForm, notes: e.target.value})} className="input-field w-full" rows={3} />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowRateModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleRateSupplier} disabled={!rateForm.quality || !rateForm.communication} className="btn-primary">Submit Rating</button>
            </div>
          </div>
        </div>
      )}

      {showBlacklistModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowBlacklistModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-2 text-red-600">Blacklist Supplier</h3>
            <p className="text-sm text-gray-500 mb-4">Are you sure you want to blacklist this supplier? This action can be reversed later.</p>
            <textarea placeholder="Reason for blacklisting *" value={blacklistReason} onChange={(e) => setBlacklistReason(e.target.value)} className="input-field w-full" rows={3} />
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowBlacklistModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleBlacklist} disabled={!blacklistReason.trim()} className="btn-danger">Confirm Blacklist</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
