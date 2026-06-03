import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, FileText, HelpCircle, FolderOpen, User,
  Loader2, AlertCircle, CheckCircle, X, Download, Edit3,
  Mail, Phone, MapPin, DollarSign, Ticket, File,
  Building2, Receipt, ChevronDown
} from 'lucide-react';
import { clientPortalService } from '../../api/portal';
import { useTheme } from '../../hooks/useTheme';
import { formatDate, formatDateTime, classNames } from '../../utils/helpers';

const fmt = (n) => new Intl.NumberFormat('en-KE', {
  style: 'currency', currency: 'KES', minimumFractionDigits: 2, maximumFractionDigits: 2,
}).format(n ?? 0);

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'invoices', label: 'Invoices', icon: Receipt },
  { id: 'tickets', label: 'Support Tickets', icon: Ticket },
  { id: 'documents', label: 'Documents', icon: FolderOpen },
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
    paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    cancelled: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    open: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    closed: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  return <span className={`${base} ${colors[status] || colors.pending}`}>{status.replace(/_/g, ' ')}</span>;
}

export function ClientPortal() {
  const { dark } = useTheme();
  const [activeTab, setActiveTab] = useState('dashboard');

  const [profile, setProfile] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [documents, setDocuments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabLoading, setTabLoading] = useState({});

  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({});
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [profileSuccess, setProfileSuccess] = useState(false);

  const [expandedTicket, setExpandedTicket] = useState(null);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [profRes, invRes, tickRes, docRes] = await Promise.all([
        clientPortalService.getInvoices().then(() => clientPortalService.getInvoices().catch(() => null)).catch(() => null),
        clientPortalService.getInvoices(),
        clientPortalService.getTickets(),
        clientPortalService.getDocuments(),
      ]);
      const asArray = (d) => (Array.isArray(d) ? d : []);
      setProfile(profRes?.data?.data || profRes?.data || null);
      setInvoices(asArray(invRes.data?.data || invRes.data));
      setTickets(asArray(tickRes.data?.data || tickRes.data));
      setDocuments(asArray(docRes.data?.data || docRes.data));
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
        invoices: async () => { const r = await clientPortalService.getInvoices(); setInvoices(asArray(r.data?.data || r.data)); },
        tickets: async () => { const r = await clientPortalService.getTickets(); setTickets(asArray(r.data?.data || r.data)); },
        documents: async () => { const r = await clientPortalService.getDocuments(); setDocuments(asArray(r.data?.data || r.data)); },
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
      const res = await clientPortalService.updateProfile(profileForm);
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

  const openTickets = tickets.filter((t) => t.status !== 'closed' && t.status !== 'resolved');
  const overdueInvoices = invoices.filter((i) => i.status === 'overdue');

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Client Portal</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your invoices, tickets, documents &amp; more</p>
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
                Welcome, {profile?.company_name || profile?.name || 'Client'}
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
              <Receipt className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{invoices.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Invoices</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Ticket className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{openTickets.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Open Tickets</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <File className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{documents.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Documents</p>
            </div>
          </div>
        </div>
      </div>

      {overdueInvoices.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 px-4 py-3 rounded-lg">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          You have {overdueInvoices.length} overdue invoice{overdueInvoices.length > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );

  const renderInvoices = () => {
    if (tabLoading.invoices) return <SkeletonCard />;
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Invoices</h2>
        {invoices.length === 0 ? (
          <EmptyState icon={Receipt} message="No invoices yet" />
        ) : (
          <div className="card">
            <div className="card-body p-0 overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Amount</th>
                    <th>Date</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td className="font-medium text-gray-900 dark:text-white">{inv.invoice_number || inv.number || `#${inv.id}`}</td>
                      <td className="font-semibold text-gray-900 dark:text-white">{fmt(inv.amount || inv.total || 0)}</td>
                      <td className="text-sm text-gray-500">{formatDate(inv.date || inv.issued_date || inv.created_at)}</td>
                      <td className="text-sm text-gray-500">{formatDate(inv.due_date)}</td>
                      <td><StatusBadge status={inv.status || 'pending'} /></td>
                      <td className="text-right">
                        <button className="flex items-center gap-1.5 ml-auto px-3 py-1.5 text-sm font-medium text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/20 rounded-lg transition-colors">
                          <Download className="w-4 h-4" />
                          <span className="hidden sm:inline">PDF</span>
                        </button>
                      </td>
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

  const renderTickets = () => {
    if (tabLoading.tickets) return <SkeletonCard />;
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Support Tickets</h2>
        {tickets.length === 0 ? (
          <EmptyState icon={HelpCircle} message="No support tickets submitted yet" />
        ) : (
          <div className="space-y-3">
            {tickets.map((t) => (
              <div key={t.id} className="card">
                <div className="card-body">
                  <button
                    onClick={() => setExpandedTicket(expandedTicket === t.id ? null : t.id)}
                    className="w-full text-left"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900 dark:text-white">{t.subject || t.title}</span>
                          <StatusBadge status={t.status || 'open'} />
                          <StatusBadge status={t.priority || 'medium'} />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {formatDateTime(t.created_at)} &middot; {t.reference || `#${t.id}`}
                        </p>
                      </div>
                      <ChevronDown className={classNames(
                        'w-5 h-5 text-gray-400 transition-transform flex-shrink-0',
                        expandedTicket === t.id ? 'rotate-180' : ''
                      )} />
                    </div>
                  </button>
                  {expandedTicket === t.id && (
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                      <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                        {t.description || t.message || 'No additional details'}
                      </p>
                      {t.assigned_to && (
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-3">
                          Assigned to: <span className="font-medium">{t.assigned_to}</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderDocuments = () => {
    if (tabLoading.documents) return <SkeletonCard />;
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Documents &amp; Reports</h2>
        {documents.length === 0 ? (
          <EmptyState icon={FolderOpen} message="No shared documents yet" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => (
              <div key={doc.id} className="card">
                <div className="card-body">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                        <File className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-medium text-gray-900 dark:text-white truncate">{doc.title || doc.name || doc.file_name}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(doc.uploaded_at || doc.created_at)}</p>
                      </div>
                    </div>
                  </div>
                  {doc.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">{doc.description}</p>
                  )}
                  <div className="mt-3">
                    <a
                      href={doc.file_url || doc.url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </a>
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
      { label: 'Company Name', value: p.company_name || p.name, icon: Building2 },
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
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Company Information</h2>
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
      case 'invoices': return renderInvoices();
      case 'tickets': return renderTickets();
      case 'documents': return renderDocuments();
      case 'profile': return renderProfile();
      default: return renderDashboard();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Client Portal</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {profile ? `Welcome, ${profile.company_name || profile.name || profile.email}` : 'Manage your invoices, tickets, documents &amp; more'}
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
