import { useState, useEffect } from 'react';
import { Plus, Building2, Phone, Mail, MapPin, User as UserIcon } from 'lucide-react';
import { vendorService } from '../../api/assets';
import { useAuth } from '../../hooks/useAuth';

export function VendorsPage() {
  const { hasRole } = useAuth();
  const canManage = hasRole('System Admin', 'CEO', 'Asset Manager', 'Procurement Officer');
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({});

  const fetch = async () => {
    setLoading(true);
    try {
      const { data } = await vendorService.list();
      setVendors(data.data || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const handleCreate = async () => {
    try { await vendorService.create(form); setShowModal(false); setForm({}); fetch(); } catch (err) { alert(err.response?.data?.message || err.message); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Vendors & Suppliers</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{vendors.length} registered vendors</p>
        </div>
        {canManage && <button onClick={() => setShowModal(true)} className="btn-primary gap-2"><Plus className="w-4 h-4" /> Add Vendor</button>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {vendors.map(v => (
          <div key={v.id} className="card">
            <div className="card-body">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-primary-600" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{v.vendor_name}</p>
                  <p className="font-mono text-xs text-gray-500">{v.vendor_code}</p>
                </div>
              </div>
              <div className="space-y-1.5 text-sm text-gray-500">
                {v.contact_person && <p className="truncate"><UserIcon className="w-3.5 h-3.5 inline mr-1.5" />{v.contact_person}</p>}
                {v.email && <p className="truncate"><Mail className="w-3.5 h-3.5 inline mr-1.5" />{v.email}</p>}
                {v.phone && <p><Phone className="w-3.5 h-3.5 inline mr-1.5" />{v.phone}</p>}
                {v.city && <p><MapPin className="w-3.5 h-3.5 inline mr-1.5" />{v.city}{v.country ? `, ${v.country}` : ''}</p>}
              </div>
              {v.services && <p className="text-xs text-gray-400 mt-2 italic">{v.services}</p>}
            </div>
          </div>
        ))}
        {vendors.length === 0 && !loading && (
          <div className="col-span-full text-center py-16 text-gray-400">
            <Building2 className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No vendors registered</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Add Vendor</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><input placeholder="Vendor Name *" value={form.vendor_name||''} onChange={e => setForm({...form, vendor_name: e.target.value})} className="input-field w-full" required /></div>
              <input placeholder="Vendor Code" value={form.vendor_code||''} onChange={e => setForm({...form, vendor_code: e.target.value})} className="input-field" />
              <input placeholder="Contact Person" value={form.contact_person||''} onChange={e => setForm({...form, contact_person: e.target.value})} className="input-field" />
              <input placeholder="Email" value={form.email||''} onChange={e => setForm({...form, email: e.target.value})} className="input-field" />
              <input placeholder="Phone" value={form.phone||''} onChange={e => setForm({...form, phone: e.target.value})} className="input-field" />
              <div className="col-span-2"><input placeholder="Address" value={form.address||''} onChange={e => setForm({...form, address: e.target.value})} className="input-field w-full" /></div>
              <input placeholder="City" value={form.city||''} onChange={e => setForm({...form, city: e.target.value})} className="input-field" />
              <input placeholder="Country" value={form.country||''} onChange={e => setForm({...form, country: e.target.value})} className="input-field" />
              <input placeholder="Tax ID" value={form.tax_id||''} onChange={e => setForm({...form, tax_id: e.target.value})} className="input-field" />
              <input placeholder="Services (e.g. ICT equipment)" value={form.services||''} onChange={e => setForm({...form, services: e.target.value})} className="input-field" />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleCreate} className="btn-primary">Add Vendor</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
