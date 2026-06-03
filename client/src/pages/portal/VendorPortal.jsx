import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, ShoppingCart, FileText, Truck, User,
  Loader2, AlertCircle, CheckCircle, X, Download, Edit3,
  Mail, Phone, MapPin, Building2, Package, Send,
  DollarSign, Plus, ChevronDown
} from 'lucide-react';
import { vendorPortalService } from '../../api/portal';
import { useTheme } from '../../hooks/useTheme';
import { formatDate, formatDateTime, classNames } from '../../utils/helpers';

const fmt = (n) => new Intl.NumberFormat('en-KE', {
  style: 'currency', currency: 'KES', minimumFractionDigits: 2, maximumFractionDigits: 2,
}).format(n ?? 0);

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'purchase_orders', label: 'Purchase Orders', icon: ShoppingCart },
  { id: 'quotations', label: 'Quotations', icon: FileText },
  { id: 'deliveries', label: 'Deliveries', icon: Truck },
  { id: 'profile', label: 'Profile', icon: User },
];

function SkeletonLine({ className }) {
  return <div className={`h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse ${className || ''}`} />;
}

function SkeletonCard() {
  return (
    <div className="card">
      <div className="card-body space-y-3">
        <SkeletonLine className="w-1/3" />
        <SkeletonLine className="w-1/2" />
        <SkeletonLine className="w-2/3" />
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, message }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
      <Icon className="w-10 h-10 mb-3" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
  const colors = {
    draft: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    ordered: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    shipped: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
    delivered: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    cancelled: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    in_review: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    accepted: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    in_transit: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  };
  return <span className={`${base} ${colors[status] || colors.pending}`}>{status.replace(/_/g, ' ')}</span>;
}

export function VendorPortal() {
  const { dark } = useTheme();
  const [activeTab, setActiveTab] = useState('dashboard');

  const [profile, setProfile] = useState(null);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [deliveries, setDeliveries] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabLoading, setTabLoading] = useState({});

  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({});
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [profileSuccess, setProfileSuccess] = useState(false);

  const [showQuotationForm, setShowQuotationForm] = useState(false);
  const [quotationForm, setQuotationForm] = useState({ title: '', description: '', amount: '' });
  const [quotationSubmitting, setQuotationSubmitting] = useState(false);
  const [quotationError, setQuotationError] = useState(null);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [profRes, poRes, quotRes, delRes] = await Promise.all([
        vendorPortalService.getPurchaseOrders().then(() => vendorPortalService.getPurchaseOrders().catch(() => null)).catch(() => null),
        vendorPortalService.getPurchaseOrders(),
        vendorPortalService.getQuotations(),
        vendorPortalService.getDeliveries(),
      ]);
      const asArray = (d) => (Array.isArray(d) ? d : []);
      setProfile(profRes?.data?.data || profRes?.data || null);
      setPurchaseOrders(asArray(poRes.data?.data || poRes.data));
      setQuotations(asArray(quotRes.data?.data || quotRes.data));
      setDeliveries(asArray(delRes.data?.data || delRes.data));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const loadTabData = useCallback(async (tab) => {
    setTabLoading((prev) => ({ ...prev, [tab]: true }));
    try {
      const asArray = (d) => (Array.isArray(d) ? d : []);
      const loaders = {
        purchase_orders: async () => { const r = await vendorPortalService.getPurchaseOrders(); setPurchaseOrders(asArray(r.data?.data || r.data)); },
        quotations: async () => { const r = await vendorPortalService.getQuotations(); setQuotations(asArray(r.data?.data || r.data)); },
        deliveries: async () => { const r = await vendorPortalService.getDeliveries(); setDeliveries(asArray(r.data?.data || r.data)); },
      };
      if (loaders[tab]) await loaders[tab]();
    } catch (err) {
      setError(err.message);
    } finally {
      setTabLoading((prev) => ({ ...prev, [tab]: false }));
    }
  }, []);

  useEffect(() => {
    if (!loading && activeTab !== 'dashboard' && activeTab !== 'profile') loadTabData(activeTab);
  }, [activeTab, loading, loadTabData]);

  const handleEditProfile = () => {
    setProfileForm({
      phone: profile?.phone || '',
      address: profile?.address || '',
    });
    setEditingProfile(true);
    setProfileSuccess(false);
    setProfileError(null);
  };

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    setProfileError(null);
    setProfileSuccess(false);
    try {
      const res = await vendorPortalService.updateProfile(profileForm);
      setProfile(res.data?.data || res.data);
      setEditingProfile(false);
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err) {
      setProfileError(err.message);
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSubmitQuotation = async (e) => {
    e.preventDefault();
    setQuotationSubmitting(true);
    setQuotationError(null);
    try {
      const res = await vendorPortalService.submitQuotation(quotationForm);
      setQuotations((prev) => [...prev, res.data?.data || res.data]);
      setShowQuotationForm(false);
      setQuotationForm({ title: '', description: '', amount: '' });
    } catch (err) {
      setQuotationError(err.message);
    } finally {
      setQuotationSubmitting(false);
    }
  };

  const pendingOrders = purchaseOrders.filter((po) => po.status === 'pending' || po.status === 'draft');
  const pendingDeliveries = deliveries.filter((d) => d.status !== 'delivered');

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Vendor Portal</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage purchase orders, quotations, deliveries &amp; more</p>
          </div>
        </div>
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-red-500">
        <AlertCircle className="w-10 h-10 mb-3" />
        <p className="text-lg font-medium">Failed to load portal data</p>
        <p className="text-sm text-gray-500 mt-1">{error}</p>
        <button onClick={loadAll} className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm">
          Retry
        </button>
      </div>
    );
  }

  const renderTabNav = () => (
    <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
      <nav className="flex gap-1 overflow-x-auto pb-px scrollbar-hide">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={classNames(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-600'
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="card">
        <div className="card-body">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <Building2 className="w-7 h-7 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Welcome, {profile?.supplier_name || profile?.company_name || profile?.name || 'Vendor'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{profile?.email || ''}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card">
          <div className="card-body flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{purchaseOrders.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Purchase Orders</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Package className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{pendingOrders.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Pending Orders</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Truck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{pendingDeliveries.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Active Deliveries</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPurchaseOrders = () => {
    if (tabLoading.purchase_orders) return <SkeletonCard />;
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Purchase Orders</h2>
        {purchaseOrders.length === 0 ? (
          <EmptyState icon={ShoppingCart} message="No purchase orders yet" />
        ) : (
          <div className="card">
            <div className="card-body p-0 overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>PO #</th>
                    <th>Title</th>
                    <th>Amount</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseOrders.map((po) => (
                    <tr key={po.id}>
                      <td className="font-medium text-gray-900 dark:text-white font-mono">
                        {po.po_number || po.number || `#${po.id}`}
                      </td>
                      <td className="text-gray-900 dark:text-white">{po.title || po.name || '-'}</td>
                      <td className="font-semibold text-gray-900 dark:text-white">{fmt(po.amount || po.total || 0)}</td>
                      <td className="text-sm text-gray-500">{formatDate(po.date || po.issued_date || po.created_at)}</td>
                      <td><StatusBadge status={po.status || 'pending'} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderQuotations = () => {
    if (tabLoading.quotations) return <SkeletonCard />;
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Quotations</h2>
          <button
            onClick={() => setShowQuotationForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Quotation
          </button>
        </div>

        {showQuotationForm && (
          <div className="card">
            <div className="card-body space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900 dark:text-white">Submit New Quotation</h3>
                <button onClick={() => { setShowQuotationForm(false); setQuotationError(null); }} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmitQuotation} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={quotationForm.title}
                    onChange={(e) => setQuotationForm((prev) => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                    placeholder="Quotation title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                  <textarea
                    required
                    rows={3}
                    value={quotationForm.description}
                    onChange={(e) => setQuotationForm((prev) => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                    placeholder="Describe your quotation"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount (KES)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={quotationForm.amount}
                    onChange={(e) => setQuotationForm((prev) => ({ ...prev, amount: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                    placeholder="0.00"
                  />
                </div>
                {quotationError && <p className="text-sm text-red-500">{quotationError}</p>}
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={quotationSubmitting}
                    className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                  >
                    {quotationSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Submit Quotation
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowQuotationForm(false); setQuotationError(null); }}
                    disabled={quotationSubmitting}
                    className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {quotations.length === 0 && !showQuotationForm ? (
          <EmptyState icon={FileText} message="No quotations yet. Submit your first quotation above." />
        ) : (
          <div className="space-y-3">
            {quotations.map((q) => (
              <div key={q.id} className="card">
                <div className="card-body">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900 dark:text-white">{q.title || q.subject || `Quotation #${q.id}`}</span>
                        <StatusBadge status={q.status || 'submitted'} />
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{q.description || ''}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-semibold text-gray-900 dark:text-white">{fmt(q.amount || q.total || 0)}</span>
                        <span>{formatDate(q.created_at || q.date)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderDeliveries = () => {
    if (tabLoading.deliveries) return <SkeletonCard />;
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Delivery Tracking</h2>
        {deliveries.length === 0 ? (
          <EmptyState icon={Truck} message="No delivery records found" />
        ) : (
          <div className="space-y-3">
            {deliveries.map((d) => (
              <div key={d.id} className="card">
                <div className="card-body">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {d.reference || d.delivery_number || d.po_number || `#${d.id}`}
                        </span>
                        <StatusBadge status={d.status || 'in_transit'} />
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {d.item_name && <span>{d.item_name}</span>}
                        {d.quantity && <span>Qty: {d.quantity}</span>}
                        {d.amount && <span className="font-semibold text-gray-900 dark:text-white">{fmt(d.amount)}</span>}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                        {d.estimated_date && <span>Est: {formatDate(d.estimated_date)}</span>}
                        {d.delivered_date && <span>Delivered: {formatDate(d.delivered_date)}</span>}
                        {d.carrier && <span>Carrier: {d.carrier}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderProfile = () => {
    const p = profile;
    if (!p) return <EmptyState icon={User} message="Profile data not available" />;

    const fields = [
      { label: 'Supplier Name', value: p.supplier_name || p.company_name || p.name, icon: Building2 },
      { label: 'Email', value: p.email, icon: Mail },
      { label: 'Phone', value: p.phone, icon: Phone, editable: true },
      { label: 'Address', value: p.address, icon: MapPin, editable: true },
    ];

    return (
      <div className="space-y-6">
        {profileSuccess && (
          <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400 px-4 py-3 rounded-lg">
            <CheckCircle className="w-4 h-4" />
            Profile updated successfully
          </div>
        )}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Supplier Information</h2>
          {!editingProfile && (
            <button onClick={handleEditProfile} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/20 rounded-lg transition-colors">
              <Edit3 className="w-4 h-4" />
              Edit
            </button>
          )}
        </div>

        {editingProfile ? (
          <div className="card">
            <div className="card-body space-y-4">
              {[
                { key: 'phone', label: 'Phone', icon: Phone },
                { key: 'address', label: 'Address', icon: MapPin },
              ].map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{field.label}</label>
                  <input
                    type="text"
                    value={profileForm[field.key] || ''}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                  />
                </div>
              ))}
              {profileError && <p className="text-sm text-red-500">{profileError}</p>}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSaveProfile}
                  disabled={profileSaving}
                  className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  {profileSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Save Changes
                </button>
                <button
                  onClick={() => setEditingProfile(false)}
                  disabled={profileSaving}
                  className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map((field) => {
              const Icon = field.icon;
              return (
                <div key={field.label} className="card">
                  <div className="card-body flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{field.label}</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{field.value || '-'}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return renderDashboard();
      case 'purchase_orders': return renderPurchaseOrders();
      case 'quotations': return renderQuotations();
      case 'deliveries': return renderDeliveries();
      case 'profile': return renderProfile();
      default: return renderDashboard();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Vendor Portal</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {profile ? `Welcome, ${profile.supplier_name || profile.company_name || profile.name || profile.email}` : 'Manage purchase orders, quotations, deliveries &amp; more'}
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 px-4 py-3 rounded-lg">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {renderTabNav()}
      {renderContent()}
    </div>
  );
}
